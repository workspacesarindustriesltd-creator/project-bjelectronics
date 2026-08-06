import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  CloudArrowUp,
  Copy,
  ImageSquare,
  Package,
  VideoCamera,
  Warning,
} from "@phosphor-icons/react";
import { Badge, Button, Card, Field, FileDropzone, PageHeader } from "./ui/index.jsx";

const initialProduct = {
  sku: "",
  name: "",
  category: "Television",
  brand: "",
  description: "",
  price: "",
  stock: "0",
};

function optimizedCloudinaryUrl(url) {
  if (!url?.includes("/upload/")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto:good,c_limit,w_1600/");
}

function IntegrationBadge({ label, status }) {
  const tone = ["ok", "configured"].includes(status) ? "success" : status === "checking" ? "info" : "warning";
  return <Badge tone={tone}>{label}: {status}</Badge>;
}

export function MediaManager({ adminRequest }) {
  const [integrations, setIntegrations] = useState({ redis: { status: "checking" }, cloudinary: { status: "checking" } });
  const [files, setFiles] = useState([]);
  const file = files[0] || null;
  const [asset, setAsset] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [notice, setNotice] = useState("");
  const [product, setProduct] = useState(initialProduct);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    adminRequest("/api/admin/integrations").then(setIntegrations).catch((error) => setUploadError(error.message));
  }, [adminRequest]);

  useEffect(() => {
    setUploadError("");
    setNotice("");
    setAsset(null);
  }, [file]);

  const resourceType = useMemo(() => file?.type?.startsWith("video/") ? "video" : "image", [file]);

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    setNotice("");
    try {
      const signature = await adminRequest(`/api/admin/media/signature?resourceType=${resourceType}`);
      const body = new FormData();
      body.append("file", file);
      body.append("api_key", signature.apiKey);
      body.append("signature", signature.signature);
      Object.entries(signature.parameters).forEach(([key, value]) => body.append(key, String(value)));
      const response = await fetch(signature.uploadUrl, { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || "Cloudinary upload failed.");
      setAsset({
        bytes: result.bytes,
        format: result.format,
        height: result.height,
        originalUrl: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        url: resourceType === "image" ? optimizedCloudinaryUrl(result.secure_url) : result.secure_url,
        width: result.width,
      });
      setNotice("Media uploaded successfully and is ready for product use.");
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = async () => {
    if (!asset?.url) return;
    await navigator.clipboard.writeText(asset.url);
    setNotice("Optimized media URL copied.");
  };

  const createProduct = async (event) => {
    event.preventDefault();
    if (!asset || asset.resourceType !== "image") return;
    setCreating(true);
    setUploadError("");
    try {
      await adminRequest("/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
          ...product,
          price: Number(product.price),
          stock: Number(product.stock),
          brand: product.brand || null,
          subcategory: null,
          oldPrice: null,
          currency: "BDT",
          availability: "in_stock",
          image: asset.url,
          sourceName: "Cloudinary",
          sourceUrl: asset.originalUrl,
          active: true,
          featured: false,
        }),
      });
      setProduct(initialProduct);
      setNotice("Product created with the uploaded Cloudinary image.");
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Asset library" title="Media and attachments" description="Upload optimized images and videos from your device, review delivery details, and create catalog items without leaving the workflow." />
      <div className="media-manager-layout">
        <Card className="media-upload-card" padding="lg">
          <header><div><p>Cloud media</p><h3>Upload product assets</h3></div><CloudArrowUp weight="duotone" /></header>
          <div className="media-integration-row">
            <IntegrationBadge label="Redis" status={integrations.redis?.status || "disabled"} />
            <IntegrationBadge label="Cloudinary" status={integrations.cloudinary?.status || "disabled"} />
          </div>
          <FileDropzone
            accept="image/*,video/*"
            maxSizeMb={resourceType === "video" ? 50 : 10}
            value={files}
            onChange={setFiles}
            label="Upload image or video"
          />
          <Button loading={uploading} disabled={!file || integrations.cloudinary?.status === "disabled"} onClick={upload}><CloudArrowUp /> Upload to Cloudinary</Button>
          {uploadError && <div className="media-message error" role="alert"><Warning weight="fill" /> {uploadError}</div>}
          {notice && <div className="media-message success" role="status"><CheckCircle weight="fill" /> {notice}</div>}
          {asset && <div className="media-result">
            {asset.resourceType === "image" ? <img src={asset.url} alt="Uploaded Cloudinary asset" /> : <video src={asset.url} controls />}
            <div><strong>{asset.publicId}</strong><span>{asset.format?.toUpperCase()} · {Math.ceil((asset.bytes || 0) / 1024)} KB</span></div>
            <Button variant="secondary" size="sm" onClick={copyUrl}><Copy /> Copy URL</Button>
          </div>}
        </Card>

        <Card className="media-product-card" padding="lg">
          <header><div><p>Catalog workflow</p><h3>Create product from media</h3></div><Package weight="duotone" /></header>
          {!asset || asset.resourceType !== "image" ? (
            <div className="media-empty"><ImageSquare weight="duotone" /><p>Upload an image to enable the product form.</p></div>
          ) : (
            <form onSubmit={createProduct} className="ui-form-stack">
              <div className="ops-form-pair">
                <Field label="SKU" required><input required value={product.sku} onChange={(event) => setProduct({ ...product, sku: event.target.value })} /></Field>
                <Field label="Brand"><input value={product.brand} onChange={(event) => setProduct({ ...product, brand: event.target.value })} /></Field>
              </div>
              <Field label="Product name" required><input required value={product.name} onChange={(event) => setProduct({ ...product, name: event.target.value })} /></Field>
              <Field label="Category" required><input required value={product.category} onChange={(event) => setProduct({ ...product, category: event.target.value })} /></Field>
              <Field label="Description" required hint="Include key specifications, condition, warranty and delivery notes."><textarea required minLength="5" value={product.description} onChange={(event) => setProduct({ ...product, description: event.target.value })} /></Field>
              <div className="ops-form-pair">
                <Field label="Price (BDT)" required><input required type="number" min="1" value={product.price} onChange={(event) => setProduct({ ...product, price: event.target.value })} /></Field>
                <Field label="Opening stock" required><input required type="number" min="0" value={product.stock} onChange={(event) => setProduct({ ...product, stock: event.target.value })} /></Field>
              </div>
              <Button loading={creating}>Create product</Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
