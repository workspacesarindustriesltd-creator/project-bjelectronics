import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  CloudArrowUp,
  Copy,
  ImageSquare,
  Package,
  SpinnerGap,
  VideoCamera,
  Warning,
} from "@phosphor-icons/react";

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
  const healthy = ["ok", "configured"].includes(status);
  return (
    <span className={`media-integration-badge ${healthy ? "ready" : status}`}>
      {healthy ? <CheckCircle weight="fill" /> : <Warning weight="fill" />}
      {label}: {status}
    </span>
  );
}

export function MediaManager({ adminRequest }) {
  const [integrations, setIntegrations] = useState({
    redis: { status: "checking" },
    cloudinary: { status: "checking" },
  });
  const [file, setFile] = useState(null);
  const [asset, setAsset] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [notice, setNotice] = useState("");
  const [product, setProduct] = useState(initialProduct);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    adminRequest("/api/admin/integrations")
      .then(setIntegrations)
      .catch((error) => setUploadError(error.message));
  }, [adminRequest]);

  const resourceType = useMemo(
    () => file?.type?.startsWith("video/") ? "video" : "image",
    [file],
  );

  const selectFile = (event) => {
    const next = event.target.files?.[0] || null;
    setUploadError("");
    setNotice("");
    setAsset(null);
    if (!next) return setFile(null);
    const supported = next.type.startsWith("image/") || next.type.startsWith("video/");
    if (!supported) return setUploadError("Choose an image or video file.");
    const maxBytes = next.type.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (next.size > maxBytes) return setUploadError(`Maximum ${next.type.startsWith("video/") ? "video" : "image"} size exceeded.`);
    setFile(next);
  };

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

      const deliveryUrl = resourceType === "image"
        ? optimizedCloudinaryUrl(result.secure_url)
        : result.secure_url;
      setAsset({
        bytes: result.bytes,
        format: result.format,
        height: result.height,
        originalUrl: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        url: deliveryUrl,
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
    <div className="media-manager-layout">
      <section className="ops-card media-upload-card">
        <header>
          <div><p>Cloud media</p><h3>Upload product assets</h3></div>
          <CloudArrowUp weight="duotone" />
        </header>
        <div className="media-integration-row">
          <IntegrationBadge label="Redis" status={integrations.redis?.status || "disabled"} />
          <IntegrationBadge label="Cloudinary" status={integrations.cloudinary?.status || "disabled"} />
        </div>
        <label className="media-dropzone">
          {resourceType === "video" ? <VideoCamera weight="duotone" /> : <ImageSquare weight="duotone" />}
          <strong>{file ? file.name : "Choose image or video"}</strong>
          <span>Images up to 10 MB · Videos up to 50 MB</span>
          <input type="file" accept="image/*,video/*" onChange={selectFile} />
        </label>
        <button className="ops-primary media-upload-button" disabled={!file || uploading || integrations.cloudinary?.status === "disabled"} onClick={upload}>
          {uploading ? <><SpinnerGap className="media-spin" /> Uploading…</> : <><CloudArrowUp /> Upload to Cloudinary</>}
        </button>
        {uploadError && <div className="media-message error"><Warning weight="fill" /> {uploadError}</div>}
        {notice && <div className="media-message success"><CheckCircle weight="fill" /> {notice}</div>}
        {asset && <div className="media-result">
          {asset.resourceType === "image" ? <img src={asset.url} alt="Uploaded Cloudinary asset" /> : <video src={asset.url} controls />}
          <div><strong>{asset.publicId}</strong><span>{asset.format?.toUpperCase()} · {Math.ceil((asset.bytes || 0) / 1024)} KB</span></div>
          <button onClick={copyUrl}><Copy /> Copy URL</button>
        </div>}
      </section>

      <section className="ops-card media-product-card">
        <header><div><p>Catalog workflow</p><h3>Create product from media</h3></div><Package weight="duotone" /></header>
        {!asset || asset.resourceType !== "image" ? (
          <div className="media-empty"><ImageSquare weight="duotone" /><p>Upload an image to enable the product form.</p></div>
        ) : (
          <form onSubmit={createProduct}>
            <div className="ops-form-pair">
              <label className="ops-field"><span>SKU</span><input required value={product.sku} onChange={(event) => setProduct({ ...product, sku: event.target.value })} /></label>
              <label className="ops-field"><span>Brand</span><input value={product.brand} onChange={(event) => setProduct({ ...product, brand: event.target.value })} /></label>
            </div>
            <label className="ops-field"><span>Product name</span><input required value={product.name} onChange={(event) => setProduct({ ...product, name: event.target.value })} /></label>
            <label className="ops-field"><span>Category</span><input required value={product.category} onChange={(event) => setProduct({ ...product, category: event.target.value })} /></label>
            <label className="ops-field"><span>Description</span><textarea required minLength="5" value={product.description} onChange={(event) => setProduct({ ...product, description: event.target.value })} /></label>
            <div className="ops-form-pair">
              <label className="ops-field"><span>Price (BDT)</span><input required type="number" min="1" value={product.price} onChange={(event) => setProduct({ ...product, price: event.target.value })} /></label>
              <label className="ops-field"><span>Opening stock</span><input required type="number" min="0" value={product.stock} onChange={(event) => setProduct({ ...product, stock: event.target.value })} /></label>
            </div>
            <button className="ops-primary" disabled={creating}>{creating ? "Creating product…" : "Create product"}</button>
          </form>
        )}
      </section>
    </div>
  );
}
