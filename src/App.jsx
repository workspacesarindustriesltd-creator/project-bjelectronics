import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  ArrowsLeftRight,
  AddressBook,
  Bell,
  BookmarkSimple,
  Buildings,
  CaretDown,
  CaretRight,
  Check,
  ChatCircleText,
  ClockCounterClockwise,
  Cube,
  Envelope,
  Headphones,
  Heart,
  House,
  List,
  Lightning,
  Lock,
  MagnifyingGlass,
  MapPin,
  Minus,
  Package,
  PencilSimple,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SignIn,
  SignOut,
  SlidersHorizontal,
  ShareNetwork,
  Scales,
  Sparkle,
  Star,
  Storefront,
  Tag,
  Trash,
  TrendUp,
  Truck,
  User,
  UserCircle,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { adminLoginUrl } from "./domain-config.js";
import { catalogCategories, importedCatalog } from "./data/caravan-catalog.js";

const products = importedCatalog;
const categoryMeta = catalogCategories;

const money = (value, currency = "BDT") =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "BDT" ? 0 : 2,
  }).format(value);

const demoOrders = [
  { id: "BJ-24018", orderNumber: "BJ-24018", status: "delivered", paymentStatus: "paid", total: 158320, currency: "BDT", createdAt: "2026-07-18T10:30:00Z" },
  { id: "BJ-23942", orderNumber: "BJ-23942", status: "shipped", paymentStatus: "paid", total: 9070, currency: "BDT", createdAt: "2026-07-23T13:15:00Z" },
  { id: "BJ-23871", orderNumber: "BJ-23871", status: "processing", paymentStatus: "paid", total: 29864, currency: "BDT", createdAt: "2026-07-26T08:45:00Z" },
];

const demoAddresses = [
  { id: "addr-1", label: "Home", recipientName: "BJ Customer", phone: "01700000000", addressLine: "House 18, Road 7, Dhanmondi", city: "Dhaka", postcode: "1209", isDefault: true },
  { id: "addr-2", label: "Office", recipientName: "BJ Customer", phone: "01700000000", addressLine: "Karwan Bazar Commercial Area", city: "Dhaka", postcode: "1215", isDefault: false },
];

const demoCoupons = [
  { id: 1, code: "WELCOME20", discountType: "percent", discountValue: 20, minimumOrder: 5000, usedCount: 186, usageLimit: 1000, active: true },
  { id: 2, code: "TECH10", discountType: "percent", discountValue: 10, minimumOrder: 3000, usedCount: 73, usageLimit: null, active: true },
];

const demoCustomers = [
  { id: "c1", name: "BJ Customer", email: "demo@bjelectronics.shop", phone: "01700000000", orderCount: 3, lifetimeValue: 197254, createdAt: "2026-02-11" },
  { id: "c2", name: "Nusrat Jahan", email: "nusrat@example.com", phone: "01811111111", orderCount: 5, lifetimeValue: 254990, createdAt: "2026-04-03" },
  { id: "c3", name: "Tanvir Ahmed", email: "tanvir@example.com", phone: "01922222222", orderCount: 2, lifetimeValue: 81200, createdAt: "2026-06-19" },
];

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error || "The request could not be completed.");
  return body;
}

function Logo({ onClick }) {
  return (
    <button className="logo-button" onClick={onClick} aria-label="Go to BJ Electronics home">
      <img src="/assets/bj-logo.png" alt="BJ Electronics" />
    </button>
  );
}

function Rating({ value, reviews, compact = false }) {
  if (!reviews) return <div className={`rating ${compact ? "compact" : ""}`} aria-label="Not yet rated"><Star size={compact ? 13 : 15} /><span>New listing</span></div>;
  return (
    <div className={`rating ${compact ? "compact" : ""}`} aria-label={`${value} out of 5 stars`}>
      <Star size={compact ? 13 : 15} weight="fill" />
      <span>{value}</span>
      {!compact && <span className="muted">({reviews} reviews)</span>}
    </div>
  );
}

function Header({ page, setPage, search, setSearch, cartCount, favorites, authUser }) {
  const nav = categoryMeta.map((category) => category.name);
  return (
    <>
      <header className="site-header">
        <div className="header-row shell">
          <button className="mobile-icon" aria-label="Open menu">
            <List size={24} />
          </button>
          <Logo onClick={() => setPage("home")} />
          <label className="search-field">
            <MagnifyingGlass size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search for products, brands and more..."
              aria-label="Search products"
            />
            <button className="search-category" type="button">
              All categories <CaretDown size={13} />
            </button>
          </label>
          <div className="header-actions">
            <button onClick={() => setPage("categories")}><Heart size={21} /><span>Wishlist</span>{favorites > 0 && <b>{favorites}</b>}</button>
            <button onClick={() => setPage("cart")}><ShoppingCart size={22} /><span>Cart</span>{cartCount > 0 && <b>{cartCount}</b>}</button>
            <button onClick={() => setPage("profile")}><User size={21} /><span>{authUser ? authUser.name.split(" ")[0] : "Sign in"}</span></button>
          </div>
          <button className="mobile-cart" onClick={() => setPage("cart")} aria-label="Open cart">
            <ShoppingCart size={24} />
            {cartCount > 0 && <b>{cartCount}</b>}
          </button>
        </div>
        <label className="mobile-search shell">
          <MagnifyingGlass size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search for products..."
            aria-label="Search products"
          />
        </label>
        <nav className="category-nav">
          <div className="shell category-nav-inner">
            <button className="all-categories" onClick={() => setPage("categories")}><List size={19} /> All Categories</button>
            {nav.map((item) => (
              <button key={item} className={page === item ? "active" : ""} onClick={() => setPage(item)}>{item}</button>
            ))}
            <button className="deal">Deals</button>
          </div>
        </nav>
      </header>
    </>
  );
}

function ServiceStrip() {
  const services = [
    [Truck, "Free delivery", "On orders over ৳5,000"],
    [ShieldCheck, "1 year warranty", "Official brand warranty"],
    [Package, "Easy returns", "30-day return policy"],
    [ShoppingBag, "Flexible checkout", "Cash on delivery or bank transfer"],
  ];
  return (
    <div className="service-strip">
      {services.map(([Icon, title, body]) => (
        <div key={title} className="service-item">
          <Icon size={25} />
          <div><strong>{title}</strong><span>{body}</span></div>
        </div>
      ))}
    </div>
  );
}

function ProductCard({ product, openProduct, toggleFavorite, isFavorite, addToCart, buyNow, toggleCompare, isCompared }) {
  const preorder = product.availability === "preorder";
  return (
    <article className="product-card">
      <button className="favorite" onClick={() => toggleFavorite(product.id)} aria-label={`Favorite ${product.name}`}>
        <Heart size={19} weight={isFavorite ? "fill" : "regular"} />
      </button>
      <button className={`compare-toggle ${isCompared ? "active" : ""}`} onClick={() => toggleCompare(product.id)} aria-label={`${isCompared ? "Remove" : "Add"} ${product.name} ${isCompared ? "from" : "to"} comparison`}>
        <Scales size={17} weight={isCompared ? "fill" : "regular"} />
      </button>
      <button className="product-hit" onClick={() => openProduct(product)}>
        <div className="product-image"><img src={product.image} alt={product.name} /></div>
        <span className="badge">{product.badge}</span>
        <p className="eyebrow">{product.category}</p>
        <h3>{product.name}</h3>
        <Rating value={product.rating} reviews={product.reviews} compact />
        <div className="price-row">
          <strong>{money(product.price)}</strong>
          {product.oldPrice && <del>{money(product.oldPrice)}</del>}
        </div>
      </button>
      <div className="product-card-actions">
        <button className="quick-add" disabled={preorder} onClick={() => addToCart(product)} aria-label={`Add ${product.name} to cart`}>
          <ShoppingBag size={16} /> {preorder ? "Pre-order" : "Add"}
        </button>
        <button className="card-buy-now" disabled={preorder} onClick={() => buyNow(product)} aria-label={`Buy ${product.name} now`}>
          <Lightning size={16} weight="fill" /> Buy now
        </button>
      </div>
    </article>
  );
}

function CompareTray({ items, remove, clear, open }) {
  return (
    <aside className="compare-tray" aria-label="Product comparison">
      <div className="compare-tray-title"><Scales weight="duotone" /><span><strong>Compare products</strong><small>{items.length} of 3 selected</small></span></div>
      <div className="compare-tray-items">
        {items.map((product) => <div key={product.id}><img src={product.image} alt="" /><span>{product.name}</span><button onClick={() => remove(product.id)} aria-label={`Remove ${product.name} from comparison`}><X /></button></div>)}
        {Array.from({ length: 3 - items.length }, (_, index) => <div className="empty" key={`empty-${index}`}><Plus /><span>Add product</span></div>)}
      </div>
      <div className="compare-tray-actions"><button onClick={clear}>Clear</button><button className="primary-button" disabled={items.length < 2} onClick={open}><ArrowsLeftRight /> Compare now</button></div>
    </aside>
  );
}

function CompareModal({ items, close, remove, openProduct, addToCart, buyNow }) {
  const rows = [
    ["Price", (product) => money(product.price)],
    ["Customer rating", (product) => product.reviews ? `${product.rating} / 5` : "New listing"],
    ["Availability", (product) => product.availability === "preorder" ? "Pre-order" : `${product.stock ?? 0} in stock`],
    ["Brand", (product) => product.brand || "—"],
    ["Warranty", () => "1 year official"],
    ["Returns", () => "30 days"],
    ["Delivery", () => "2–4 business days"],
  ];
  return (
    <div className="modal-backdrop compare-backdrop" role="dialog" aria-modal="true" aria-label="Compare selected products">
      <section className="compare-modal">
        <header><div><p>Side-by-side</p><h2>Compare products</h2><span>Choose confidently with the details that matter most.</span></div><button onClick={close} aria-label="Close comparison"><X /></button></header>
        <div className="compare-swipe-hint"><ArrowsLeftRight /> Swipe horizontally to compare every product</div>
        <div className="compare-table" style={{ gridTemplateColumns: `135px repeat(${items.length}, minmax(0, 1fr))` }}>
          <div className="compare-label top">Product</div>
          {items.map((product) => <article className="compare-product" key={product.id}><button onClick={() => remove(product.id)} aria-label={`Remove ${product.name}`}><X /></button><img src={product.image} alt={product.name} /><small>{product.category}</small><strong>{product.name}</strong><button className="compare-view" onClick={() => { close(); openProduct(product); }}>View details</button></article>)}
          {rows.map(([label, value]) => <div className="compare-row" key={label}><div className="compare-label">{label}</div>{items.map((product) => <div key={product.id}>{value(product)}</div>)}</div>)}
        </div>
        <footer style={{ gridTemplateColumns: `135px repeat(${items.length}, minmax(0, 1fr))` }}>{items.map((product) => <div key={product.id}><button disabled={product.availability === "preorder"} onClick={() => addToCart(product)}><ShoppingCart /> Add to cart</button><button disabled={product.availability === "preorder"} onClick={() => { close(); buyNow(product); }}><Lightning weight="fill" /> Buy now</button></div>)}</footer>
      </section>
    </div>
  );
}

function ReviewSection({ product, authUser, onSignIn }) {
  const [reviews, setReviews] = useState([]);
  const [draft, setDraft] = useState({ rating: 5, title: "", body: "" });
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setSubmitted(false);
    try {
      const local = JSON.parse(localStorage.getItem(`bj-reviews-${product.id}`));
      if (local?.length) setReviews(local);
      else setReviews([]);
    } catch { setReviews([]); }
    apiRequest(`/api/products/${product.id}/reviews`).then((response) => {
      if (response.reviews?.length) setReviews(response.reviews);
    }).catch(() => {});
  }, [product.id]);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length : 0;
  const submit = async (event) => {
    event.preventDefault();
    if (!authUser) return onSignIn();
    const review = { id: `local-${Date.now()}`, name: authUser.name, ...draft, verifiedPurchase: true, createdAt: new Date().toISOString() };
    const next = [review, ...reviews];
    setReviews(next);
    localStorage.setItem(`bj-reviews-${product.id}`, JSON.stringify(next));
    setDraft({ rating: 5, title: "", body: "" });
    setSubmitted(true);
    try {
      const response = await apiRequest(`/api/products/${product.id}/reviews`, { method: "POST", body: JSON.stringify(draft) });
      if (response.review) setReviews((items) => [response.review, ...items.filter((item) => item.id !== review.id)]);
    } catch { /* Local review remains available in preview mode. */ }
  };
  return (
    <section className="reviews-section">
      <div className="reviews-heading"><div><p>Customer feedback</p><h2>Ratings & reviews</h2></div><div className="review-score"><strong>{reviews.length ? average.toFixed(1) : "New"}</strong><span>{[1, 2, 3, 4, 5].map((item) => <Star key={item} weight={item <= Math.round(average) ? "fill" : "regular"} />)}<small>{reviews.length ? `Based on ${reviews.length} reviews` : "Be the first to review"}</small></span></div></div>
      <div className="reviews-layout">
        <div className="review-list">{reviews.length ? reviews.map((review) => <article key={review.id}><header><div className="review-avatar">{review.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div><strong>{review.name}</strong><span>{review.verifiedPurchase && <b><ShieldCheck weight="fill" /> Verified purchase</b>}{new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div><div>{[1, 2, 3, 4, 5].map((item) => <Star key={item} weight={item <= review.rating ? "fill" : "regular"} />)}</div></header><h3>{review.title}</h3><p>{review.body}</p></article>) : <div className="empty-reviews"><Star weight="duotone" /><h3>No reviews yet</h3><p>Share the first verified experience for this new catalog listing.</p></div>}</div>
        <form className="review-form" onSubmit={submit}><span><ChatCircleText weight="duotone" /></span><h3>Share your experience</h3><p>Help other shoppers make a confident choice.</p>{submitted && <div className="review-success"><Check weight="bold" /> Thank you—your review has been added.</div>}<label><b>Your rating</b><select value={draft.rating} onChange={(event) => setDraft({ ...draft, rating: Number(event.target.value) })}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}</select></label><label><b>Review title</b><input required value={draft.title} maxLength="80" onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="What stood out?" /></label><label><b>Your review</b><textarea required value={draft.body} maxLength="600" onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Quality, delivery, setup or support…" /></label><button className="primary-button">{authUser ? "Submit review" : "Sign in to review"}</button></form>
      </div>
    </section>
  );
}

function Section({ title, subtitle, children, onViewAll }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <button onClick={onViewAll}>View all <ArrowRight size={15} /></button>
      </div>
      {children}
    </section>
  );
}

function Home({ products, visibleProducts, setPage, openProduct, toggleFavorite, favorites, addToCart, buyNow, toggleCompare, compareIds, recentlyViewed }) {
  const heroProduct = products[0];
  const applianceProduct = products.find((product) => product.category === "Home Appliances");
  const powerProduct = products.find((product) => product.category === "Portable Power Station (IPS)");
  return (
    <>
      <main className="shell home-main">
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-kicker"><Sparkle size={16} weight="fill" /> The new standard</span>
            <h1>Smarter appliances.<br />Better everyday living.</h1>
            <p>Shop trusted televisions, home appliances and backup power—organized for customers across Bangladesh.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => openProduct(heroProduct)}>Shop featured TV <ArrowRight size={18} /></button>
              <button className="text-button" onClick={() => setPage("categories")}>Explore departments</button>
            </div>
            <div className="hero-dots"><i className="active" /><i /><i /><i /></div>
          </div>
          <div className="hero-product">
            <span className="hero-pill">{heroProduct.badge}</span>
            <img src={heroProduct.image} alt={heroProduct.name} />
          </div>
        </section>
        <ServiceStrip />
        <Section title="Shop by category" subtitle="Everything you need, in one place" onViewAll={() => setPage("categories")}>
          <div className="category-grid">
            {categoryMeta.map((category) => (
              <button key={category.name} className="category-card" onClick={() => setPage(category.name)}>
                <img src={category.image} alt="" />
                <strong>{category.name}</strong>
                <span>{category.note}</span>
              </button>
            ))}
          </div>
        </Section>
        <Section title="New arrivals" subtitle="Fresh technology, just landed" onViewAll={() => setPage("categories")}>
          <div className="product-grid">
            {visibleProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} openProduct={openProduct} addToCart={addToCart} buyNow={buyNow} toggleFavorite={toggleFavorite} isFavorite={favorites.includes(product.id)} toggleCompare={toggleCompare} isCompared={compareIds.includes(product.id)} />
            ))}
          </div>
        </Section>
        <section className="campaign-grid">
          <button onClick={() => setPage("Home Appliances")} className="campaign campaign-a">
            <div><span>Kitchen essentials</span><h3>Make everyday easier.</h3><p>Air fryers, mixer grinders and practical home appliances.</p><b>Shop appliances <ArrowRight size={15} /></b></div>
            <img src={applianceProduct.image} alt={applianceProduct.name} />
          </button>
          <button onClick={() => setPage("Portable Power Station (IPS)")} className="campaign campaign-b">
            <div><span>Backup power</span><h3>Stay powered anywhere.</h3><p>EcoFlow stations and portable solar solutions.</p><b>Shop power <ArrowRight size={15} /></b></div>
            <img src={powerProduct.image} alt={powerProduct.name} />
          </button>
        </section>
        <Section title="Featured products" subtitle="Customer favorites chosen for performance" onViewAll={() => setPage("categories")}>
          <div className="product-grid">
            {visibleProducts.slice(4, 8).map((product) => (
              <ProductCard key={product.id} product={product} openProduct={openProduct} addToCart={addToCart} buyNow={buyNow} toggleFavorite={toggleFavorite} isFavorite={favorites.includes(product.id)} toggleCompare={toggleCompare} isCompared={compareIds.includes(product.id)} />
            ))}
          </div>
        </Section>
        {recentlyViewed.length > 0 && <Section title="Recently viewed" subtitle="Pick up where you left off">
          <div className="recently-viewed-head"><ClockCounterClockwise weight="duotone" /><span>Your recent products are saved on this device.</span></div>
          <div className="product-grid">
            {recentlyViewed.map((product) => <ProductCard key={product.id} product={product} openProduct={openProduct} addToCart={addToCart} buyNow={buyNow} toggleFavorite={toggleFavorite} isFavorite={favorites.includes(product.id)} toggleCompare={toggleCompare} isCompared={compareIds.includes(product.id)} />)}
          </div>
        </Section>}
      </main>
      <Newsletter />
    </>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <section className="newsletter">
      <div className="shell newsletter-inner">
        <div><span>Stay in the loop</span><h2>Deals, drops and smart tech—delivered.</h2></div>
        <form onSubmit={(e) => { e.preventDefault(); if (email) setDone(true); }}>
          {done ? <p className="success"><Check size={19} weight="bold" /> You're on the list.</p> : (
            <>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" aria-label="Email address" />
              <button>Subscribe</button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}

function CategoryPage({ category, query, openProduct, toggleFavorite, favorites, addToCart, buyNow, catalog, toggleCompare, compareIds }) {
  const [sort, setSort] = useState("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const base = category === "categories" ? catalog : catalog.filter((p) => p.category === category);
  const filtered = base.filter((p) => [p.name, p.category, p.subcategory, p.brand].some((value) => String(value || "").toLowerCase().includes(query.toLowerCase())));
  const sorted = [...filtered].sort((a, b) => sort === "low" ? a.price - b.price : sort === "rating" ? b.rating - a.rating : a.id - b.id);
  return (
    <main className="shell listing-page">
      <div className="breadcrumbs"><button>Home</button><CaretRight /><span>{category === "categories" ? "All products" : category}</span></div>
      <div className="listing-head">
        <div><p>Curated technology</p><h1>{category === "categories" ? "Explore all products" : category}</h1><span>{sorted.length} products available</span></div>
        <div className="listing-controls">
          <button className="filter-toggle" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal /> Filters</button>
          <label>Sort by:
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">Featured</option><option value="low">Price: low to high</option><option value="rating">Top rated</option>
            </select>
          </label>
        </div>
      </div>
      <div className="listing-layout">
        <aside className={filtersOpen ? "filters open" : "filters"}>
          <div className="filter-title"><strong>Filters</strong><button onClick={() => setFiltersOpen(false)}><X /></button></div>
          <div className="filter-group"><strong>Category</strong>{categoryMeta.map((item) => <label key={item.name}><input type="checkbox" defaultChecked={category === item.name} /> {item.name}<span>{products.filter((p) => p.category === item.name).length}</span></label>)}</div>
          <div className="filter-group"><strong>Price range</strong><input className="range" type="range" min="1000" max="500000" defaultValue="500000" /><div className="range-values"><span>৳1,000</span><span>৳500,000+</span></div></div>
          <div className="filter-group"><strong>Rating</strong>{[4, 3, 2].map((n) => <label key={n}><input type="checkbox" /> <span className="stars">{"★".repeat(n)}{"☆".repeat(5 - n)}</span> & up</label>)}</div>
          <button className="primary-button apply-filters" onClick={() => setFiltersOpen(false)}>Apply filters</button>
        </aside>
        <div className="product-grid listing-grid">
          {sorted.map((product) => (
            <ProductCard key={product.id} product={product} openProduct={openProduct} addToCart={addToCart} buyNow={buyNow} toggleFavorite={toggleFavorite} isFavorite={favorites.includes(product.id)} toggleCompare={toggleCompare} isCompared={compareIds.includes(product.id)} />
          ))}
          {sorted.length === 0 && <div className="empty-state"><MagnifyingGlass size={34} /><h3>No products found</h3><p>Try another search term.</p></div>}
        </div>
      </div>
    </main>
  );
}

function ProductPage({ product, addToCart, buyNow, toggleFavorite, isFavorite, openProduct, catalog, toggleCompare, compareIds, authUser, onSignIn }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [postcode, setPostcode] = useState("1209");
  const [deliveryEstimate, setDeliveryEstimate] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  useEffect(() => {
    setQty(1);
    setDeliveryEstimate("");
    setShareStatus("");
  }, [product.id]);
  const add = () => {
    for (let i = 0; i < qty; i += 1) addToCart(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };
  const estimateDelivery = (event) => {
    event.preventDefault();
    if (!/^\d{4}$/.test(postcode)) return setDeliveryEstimate("Enter a valid four-digit Bangladesh postcode.");
    setDeliveryEstimate(/^12|^13/.test(postcode) ? "Dhaka metro · Estimated delivery in 1–2 business days." : "Nationwide delivery · Estimated in 3–5 business days.");
  };
  const shareProduct = async () => {
    const shareData = { title: `${product.name} — BJ Electronics`, text: product.description, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.href);
      setShareStatus(navigator.share ? "Shared" : "Link copied");
    } catch { setShareStatus("Ready to share"); }
    window.setTimeout(() => setShareStatus(""), 1800);
  };
  return (
    <main className="shell product-page">
      <div className="breadcrumbs"><button>Home</button><CaretRight /><span>{product.category}</span><CaretRight /><span>{product.name}</span></div>
      <section className="product-detail">
        <div className="gallery">
          <div className="thumbnails">
            {[0, 1, 2].map((item) => <button key={item} className={item === 0 ? "active" : ""}><img src={product.image} alt="" /></button>)}
          </div>
          <div className="detail-image"><span>{product.badge}</span><img src={product.image} alt={product.name} /><button><MagnifyingGlass /> Hover to zoom</button></div>
        </div>
        <div className="product-info">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <Rating value={product.rating} reviews={product.reviews} />
          <p className="description">{product.description}</p>
          <div className="detail-price"><strong>{money(product.price)}</strong>{product.oldPrice && <del>{money(product.oldPrice)}</del>}<span>{product.availability === "preorder" ? "Pre-order" : "In stock"}</span></div>
          <div className="product-spec-pills"><span><b>Brand</b>{product.brand}</span><span><b>Type</b>{product.subcategory}</span><span><b>SKU</b>{product.sku}</span></div>
          <div className="features"><strong>Shopping confidence</strong><span><Check /> Organized under {product.subcategory}</span><span><Check /> Bangladesh delivery estimate available</span><span><Check /> Cash on delivery and bank transfer</span><span><Check /> Warranty support through BJ Electronics</span></div>
          <div className="purchase-row">
            <div className="quantity"><button onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty === 1} aria-label="Decrease quantity"><Minus /></button><span>{qty}</span><button onClick={() => setQty(Math.min(10, qty + 1))} disabled={qty === 10} aria-label="Increase quantity"><Plus /></button></div>
            <button className="primary-button add-cart" disabled={product.availability === "preorder"} onClick={add}>{product.availability === "preorder" ? "Pre-order coming soon" : added ? <><Check weight="bold" /> Added to cart</> : <><ShoppingCart /> Add to cart</>}</button>
            <button className="buy-now-button" disabled={product.availability === "preorder"} onClick={() => buyNow(product, qty)}><Lightning weight="fill" /> Buy now</button>
          </div>
          <div className="purchase-confidence">
            <span><Truck weight="duotone" /><b>Fast delivery</b> Estimated 2–4 business days</span>
            <span><ShieldCheck weight="duotone" /><b>Protected purchase</b> Warranty and 30-day returns</span>
          </div>
          <form className="delivery-estimator" onSubmit={estimateDelivery}><label><MapPin weight="duotone" /><span><b>Check delivery</b><small>Enter your postcode</small></span></label><input value={postcode} onChange={(event) => setPostcode(event.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" aria-label="Delivery postcode" /><button>Estimate</button>{deliveryEstimate && <p className={deliveryEstimate.startsWith("Enter") ? "error" : ""}>{deliveryEstimate}</p>}</form>
          <div className="product-utility-row"><button className={`wishlist-button ${isFavorite ? "active" : ""}`} onClick={() => toggleFavorite(product.id)}><Heart weight={isFavorite ? "fill" : "regular"} /> {isFavorite ? "Saved to wishlist" : "Add to wishlist"}</button><button className={`compare-product-button ${compareIds.includes(product.id) ? "active" : ""}`} onClick={() => toggleCompare(product.id)}><Scales weight={compareIds.includes(product.id) ? "fill" : "regular"} /> {compareIds.includes(product.id) ? "Comparing" : "Compare"}</button><button className="share-product-button" onClick={shareProduct}><ShareNetwork /> {shareStatus || "Share"}</button></div>
        </div>
      </section>
      <ServiceStrip />
      <ReviewSection product={product} authUser={authUser} onSignIn={onSignIn} />
      <Section title="You may also like" subtitle="More customer favorites">
        <div className="product-grid">
          {catalog.filter((p) => p.id !== product.id).sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category)).slice(0, 4).map((item) => (
            <ProductCard key={item.id} product={item} openProduct={openProduct} addToCart={addToCart} buyNow={buyNow} toggleFavorite={toggleFavorite} isFavorite={false} toggleCompare={toggleCompare} isCompared={compareIds.includes(item.id)} />
          ))}
        </div>
      </Section>
    </main>
  );
}

function CartPage({
  cart,
  setCart,
  setPage,
  openProduct,
  authUser,
  onOrderPlaced,
  checkoutIntent,
  onCheckoutItemsChange,
  onCheckoutOpened,
  onCheckoutAuthRequired,
  onCheckoutComplete,
  savedProducts,
  onSaveForLater,
  onMoveSavedToCart,
  onRemoveSaved,
}) {
  const [promo, setPromo] = useState("");
  const [discount, setDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState("");
  const [checkout, setCheckout] = useState(false);
  const [checkoutState, setCheckoutState] = useState("form");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [placedOrder, setPlacedOrder] = useState(null);
  const [shipping, setShipping] = useState({
    name: authUser?.name || "",
    email: authUser?.email || "",
    phone: authUser?.phone || "",
    address: "",
    city: "Dhaka",
    state: "Dhaka",
    postcode: "1215",
    country: "Bangladesh",
  });
  const activeCart = checkoutIntent?.items || cart;
  const isExpress = checkoutIntent?.source === "buy-now";
  const setActiveCart = (items) => {
    if (checkoutIntent) onCheckoutItemsChange(items);
    else setCart(items);
  };
  const grouped = useMemo(() => Object.values(activeCart.reduce((acc, item) => {
    acc[item.id] = acc[item.id] ? { ...acc[item.id], qty: acc[item.id].qty + 1 } : { ...item, qty: 1 };
    return acc;
  }, {})), [activeCart]);
  const subtotal = activeCart.reduce((sum, item) => sum + item.price, 0);
  const tax = 0;
  const total = subtotal + tax - discount;
  const updateQty = (product, delta) => {
    if (delta > 0) {
      const current = activeCart.filter((item) => item.id === product.id).length;
      if (current < 10) setActiveCart([...activeCart, product]);
    }
    else {
      const index = activeCart.findIndex((item) => item.id === product.id);
      if (index > -1) setActiveCart(activeCart.filter((_, i) => i !== index));
    }
  };
  const applyCoupon = async (event) => {
    event.preventDefault();
    setPromoMessage("");
    try {
      const response = await apiRequest("/api/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code: promo, subtotal }),
      });
      const coupon = response.coupon;
      setDiscount(coupon.discountType === "percent" ? subtotal * (coupon.discountValue / 100) : coupon.discountValue);
      setPromoMessage("Coupon applied.");
    } catch {
      if (promo.toUpperCase() === "WELCOME20" && subtotal >= 100) {
        setDiscount(subtotal * .2);
        setPromoMessage("Coupon applied in demo mode.");
      } else {
        setDiscount(0);
        setPromoMessage("That coupon is invalid or does not meet the minimum order.");
      }
    }
  };
  const beginCheckout = () => {
    if (!authUser) {
      onCheckoutAuthRequired(activeCart);
      return setPage("profile");
    }
    setCheckout(true);
    setCheckoutState("form");
    setCheckoutError("");
  };
  useEffect(() => {
    if (checkoutIntent?.autoOpen && authUser && activeCart.length) {
      setCheckout(true);
      setCheckoutState("form");
      setCheckoutError("");
      onCheckoutOpened();
    }
  }, [checkoutIntent?.id, checkoutIntent?.autoOpen, authUser?.id]);
  const submitCheckout = async (event) => {
    event.preventDefault();
    setCheckoutBusy(true);
    setCheckoutError("");
    try {
      const response = await apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items: grouped.map((item) => ({ productId: item.id, quantity: item.qty })),
          customer: shipping,
          currency: "BDT",
          paymentMethod,
        }),
      });
      setPlacedOrder(response.order);
      setCheckoutState("confirmed");
      onOrderPlaced(response.order);
    } catch (error) {
      setCheckoutError(error.message);
    } finally {
      setCheckoutBusy(false);
    }
  };
  return (
    <main className="shell cart-page">
      <div className="breadcrumbs"><button onClick={() => { if (checkoutIntent) onCheckoutComplete(false); setPage("home"); }}><ArrowLeft /> Continue shopping</button></div>
      <div className="cart-title">
        <p>{isExpress ? "Express purchase" : "Your bag"}</p>
        <h1>{isExpress ? "Buy now checkout" : "Shopping cart"}</h1>
        <span>{activeCart.length} {activeCart.length === 1 ? "item" : "items"}{isExpress && <b><Lightning weight="fill" /> Reserved for checkout</b>}</span>
      </div>
      {activeCart.length === 0 ? (
        <div className="empty-cart"><ShoppingBag size={48} /><h2>Your cart is ready for something great.</h2><p>Explore the latest smart technology and add your favorites.</p><button className="primary-button" onClick={() => setPage("home")}>Start shopping</button></div>
      ) : (
        <div className="cart-layout">
          <section className="cart-items">
            {grouped.map((item) => (
              <article className="cart-item" key={item.id}>
                <button className="cart-image" onClick={() => openProduct(item)}><img src={item.image} alt={item.name} /></button>
                <div className="cart-item-copy"><p>{item.category}</p><h3>{item.name}</h3><span>{item.brand} · {item.subcategory}</span><strong>{money(item.price)}</strong></div>
                <div className="cart-item-actions">
                  <div className="cart-secondary-actions"><button className="save-later" onClick={() => { onSaveForLater(item); setActiveCart(activeCart.filter((product) => product.id !== item.id)); }}><BookmarkSimple /> Save for later</button><button className="remove" onClick={() => setActiveCart(activeCart.filter((p) => p.id !== item.id))}><X /> Remove</button></div>
                  <div className="quantity"><button onClick={() => updateQty(item, -1)} aria-label={`Decrease ${item.name} quantity`}><Minus /></button><span>{item.qty}</span><button onClick={() => updateQty(item, 1)} disabled={item.qty >= 10} aria-label={`Increase ${item.name} quantity`}><Plus /></button></div>
                </div>
              </article>
            ))}
            <form className="promo" onSubmit={applyCoupon}>
              <div><strong>Have a promo code?</strong><span>Try WELCOME20</span></div>
              <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Enter code" />
              <button>Apply</button>
              {promoMessage && <p className={discount > 0 ? "" : "promo-error"}>{discount > 0 && <Check />} {promoMessage}{discount > 0 && ` You saved ${money(discount)}.`}</p>}
            </form>
          </section>
          <aside className="summary-card">
            <h2>Order summary</h2>
            <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
            {discount > 0 && <div className="discount"><span>Discount</span><strong>-{money(discount)}</strong></div>}
            <div><span>Shipping</span><strong className="free">FREE</strong></div>
            <div><span>Estimated tax</span><strong>{money(tax)}</strong></div>
            <div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div>
            <button className="primary-button" onClick={beginCheckout}>{authUser ? isExpress ? "Continue with Buy now" : "Proceed to checkout" : "Sign in to checkout"} <ArrowRight /></button>
            <p><ShieldCheck /> Order securely with offline payment options</p>
          </aside>
        </div>
      )}
      {savedProducts.length > 0 && <section className="saved-later-panel"><header><div><BookmarkSimple weight="duotone" /><span><p>Keep for later</p><h2>Saved items</h2></span></div><small>{savedProducts.length} saved</small></header><div>{savedProducts.map((product) => <article key={product.id}><button className="saved-product-image" onClick={() => openProduct(product)}><img src={product.image} alt={product.name} /></button><span><small>{product.category}</small><strong>{product.name}</strong><b>{money(product.price)}</b></span><button className="move-to-cart" onClick={() => onMoveSavedToCart(product)}><ShoppingCart /> Move to cart</button><button className="remove-saved" onClick={() => onRemoveSaved(product.id)} aria-label={`Remove ${product.name} from saved items`}><X /></button></article>)}</div></section>}
      {checkout && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className={`checkout-modal ${checkoutState === "form" ? "checkout-form-modal" : ""}`}>
            <button className="modal-close" onClick={() => setCheckout(false)}><X /></button>
            {checkoutState === "form" ? (
              <>
                <p>Order checkout</p><h2>Delivery details</h2>
                <span>Confirm your delivery details and choose an available payment method.</span>
                <form className="checkout-form" onSubmit={submitCheckout}>
                  <label><span>Full name</span><input required value={shipping.name} onChange={(e) => setShipping({ ...shipping, name: e.target.value })} /></label>
                  <label><span>Email address</span><input required type="email" value={shipping.email} onChange={(e) => setShipping({ ...shipping, email: e.target.value })} /></label>
                  <label><span>Phone number</span><input required value={shipping.phone} onChange={(e) => setShipping({ ...shipping, phone: e.target.value })} placeholder="01XXXXXXXXX" /></label>
                  <label className="wide"><span>Street address</span><input required value={shipping.address} onChange={(e) => setShipping({ ...shipping, address: e.target.value })} placeholder="House, road and area" /></label>
                  <label><span>City</span><input required value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} /></label>
                  <label><span>Postcode</span><input required value={shipping.postcode} onChange={(e) => setShipping({ ...shipping, postcode: e.target.value })} /></label>
                  <label className="wide"><span>Payment method</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="cash_on_delivery">Cash on delivery</option><option value="bank_transfer">Bank transfer</option></select></label><div className="checkout-total wide"><span>Order total</span><strong>{money(total)}</strong></div>
                  {checkoutError && <div className="checkout-error wide">{checkoutError}</div>}
                  <button className="primary-button wide" disabled={checkoutBusy}>{checkoutBusy ? "Placing order…" : <><Lock weight="bold" /> Place order</>}</button>
                </form>
              </>
            ) : (
              <>
                <div className="checkout-icon"><Check weight="bold" /></div>
                <p>Order confirmed</p><h2>Smart choice. It's on the way.</h2>
                <span>Order {placedOrder?.orderNumber} is now visible in your account history.</span>
                <div><b>Order total</b><strong>{money(total)}</strong></div>
                <button className="primary-button" onClick={() => { setCheckout(false); onCheckoutComplete(true); setPage("profile"); }}>View my order</button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function AuthPanel({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "demo@bjelectronics.shop", phone: "01700000000", password: "demo12345" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(mode === "login" ? { email: form.email, password: form.password } : form),
      });
      onAuthenticated(response.user);
    } catch (requestError) {
      const demo = { id: "demo-customer", name: "BJ Customer", email: "demo@bjelectronics.shop", phone: "01700000000", role: "customer" };
      if (mode === "login" && form.email === demo.email && form.password === "demo12345") onAuthenticated(demo);
      else if (mode === "register" && requestError instanceof TypeError) onAuthenticated({ id: `local-${Date.now()}`, name: form.name, email: form.email, phone: form.phone, role: "customer" });
      else setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };
  const useDemo = () => setForm({
    ...form,
    email: "demo@bjelectronics.shop",
    password: "demo12345",
  });
  return (
    <main className="shell auth-page">
      <section className="auth-intro">
        <span><ShieldCheck weight="fill" /> Secure BJ account</span>
        <h1>Your tech, orders and support—all in one place.</h1>
        <p>Save your delivery details, track every order and enjoy a faster checkout experience.</p>
        <div><b>01</b><span><strong>Track orders</strong>See confirmation, processing and delivery progress.</span></div>
        <div><b>02</b><span><strong>Checkout faster</strong>Reuse verified customer and delivery details.</span></div>
        <div><b>03</b><span><strong>Dedicated support</strong>Keep every purchase connected to your profile.</span></div>
      </section>
      <section className="auth-card">
        <div className="auth-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Sign in</button><button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Create account</button></div>
        <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p>{mode === "login" ? "Sign in to continue shopping and manage orders." : "Join BJ Electronics in less than a minute."}</p>
        <form onSubmit={submit}>
          {mode === "register" && <label><span>Full name</span><div><User /><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div></label>}
          <label><span>Email address</span><div><Envelope /><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div></label>
          {mode === "register" && <label><span>Phone number</span><div><Phone /><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div></label>}
          <label><span>Password</span><div><Lock /><input required type="password" minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div></label>
          {error && <div className="auth-error">{error}</div>}
          <button className="primary-button" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? <><SignIn /> Sign in securely</> : "Create account"}</button>
        </form>
        {mode === "login" && <div className="demo-logins"><span>Demo customer</span><button onClick={useDemo}>Use customer account</button><a href={adminLoginUrl}>Administrator portal <ArrowSquareOut /></a></div>}
      </section>
    </main>
  );
}

function OrderHistory({ orders }) {
  const [selected, setSelected] = useState(null);
  const milestones = ["confirmed", "processing", "shipped", "delivered"];
  const progressFor = (status) => status === "pending" ? 0 : Math.max(0, milestones.indexOf(status));
  return (
    <section className="order-history">
      <div className="account-section-head"><div><p>Purchase history</p><h2>My orders</h2></div><span>{orders.length} orders</span></div>
      <div className="order-list">
        {orders.map((order) => (
          <article key={order.id}>
            <div className="order-icon"><Package weight="duotone" /></div>
            <div><span>Order {order.orderNumber}</span><strong>{new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong></div>
            <div><span>Payment</span><strong className="paid">{order.paymentStatus}</strong></div>
            <div><span>Total</span><strong>{money(order.total)}</strong></div>
            <div className={`order-status ${order.status}`}>{order.status}</div>
            <button aria-label={`View ${order.orderNumber}`} onClick={() => setSelected(selected?.id === order.id ? null : order)}><CaretRight /></button>
            {selected?.id === order.id && (
              <div className="tracking-panel">
                <div className="tracking-head"><span><Truck weight="duotone" /></span><div><strong>Track order</strong><small>Estimated delivery: {order.status === "delivered" ? "Delivered" : "2–4 business days"}</small></div></div>
                <div className="tracking-steps">
                  {milestones.map((step, index) => <div className={index <= progressFor(order.status) ? "complete" : ""} key={step}><i>{index <= progressFor(order.status) ? <Check weight="bold" /> : index + 1}</i><span>{step}</span></div>)}
                </div>
                <div className="tracking-meta"><span><b>Payment</b>{order.paymentStatus}</span><span><b>Delivery</b>Pathao Courier</span><span><b>Reference</b>{order.orderNumber}</span></div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function WishlistPanel({ catalog, favorites, toggleFavorite, openProduct, addToCart }) {
  const saved = catalog.filter((product) => favorites.includes(product.id));
  return (
    <section className="account-panel">
      <div className="account-section-head"><div><p>Saved products</p><h2>My wishlist</h2></div><span>{saved.length} items</span></div>
      {saved.length ? <div className="wishlist-grid">{saved.map((product) => (
        <article key={product.id}>
          <button className="wishlist-remove" onClick={() => toggleFavorite(product.id)} aria-label={`Remove ${product.name}`}><X /></button>
          <button className="wishlist-image" onClick={() => openProduct(product)}><img src={product.image} alt={product.name} /></button>
          <span>{product.category}</span><h3>{product.name}</h3><strong>{money(product.price)}</strong>
          <button className="primary-button" onClick={() => addToCart(product)}><ShoppingCart /> Add to cart</button>
        </article>
      ))}</div> : <div className="account-empty"><Heart size={42} weight="duotone" /><h3>Your wishlist is ready for great finds</h3><p>Tap the heart on any product to save it here.</p></div>}
    </section>
  );
}

function AddressPanel({ initialAddresses, authUser }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "Home", recipientName: authUser.name, phone: authUser.phone || "", addressLine: "", city: "Dhaka", postcode: "", isDefault: false });
  const saveAddress = async (event) => {
    event.preventDefault();
    const address = { ...form, id: `address-${Date.now()}` };
    setAddresses((items) => form.isDefault ? [address, ...items.map((item) => ({ ...item, isDefault: false }))] : [...items, address]);
    setAdding(false);
    setForm({ ...form, addressLine: "", postcode: "", isDefault: false });
    try { await apiRequest("/api/account/addresses", { method: "POST", body: JSON.stringify(form) }); } catch { /* Demo remains functional without the API. */ }
  };
  const removeAddress = async (id) => {
    setAddresses((items) => items.filter((item) => item.id !== id));
    try { await apiRequest(`/api/account/addresses/${id}`, { method: "DELETE" }); } catch { /* Demo remains functional without the API. */ }
  };
  return (
    <section className="account-panel">
      <div className="account-section-head"><div><p>Fast checkout</p><h2>Saved addresses</h2></div><button onClick={() => setAdding(!adding)}><Plus /> Add address</button></div>
      {adding && <form className="address-form" onSubmit={saveAddress}>
        <label><span>Label</span><input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label>
        <label><span>Recipient</span><input required value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} /></label>
        <label><span>Phone</span><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label className="wide"><span>Street address</span><input required value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} /></label>
        <label><span>City</span><input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
        <label><span>Postcode</span><input required value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} /></label>
        <label className="default-check"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> Make this my default address</label>
        <div className="form-actions"><button type="button" onClick={() => setAdding(false)}>Cancel</button><button className="primary-button">Save address</button></div>
      </form>}
      <div className="address-grid">{addresses.map((address) => <article key={address.id}>
        <div><MapPin weight="duotone" /><span>{address.label}</span>{address.isDefault && <b>Default</b>}</div>
        <h3>{address.recipientName}</h3><p>{address.addressLine}<br />{address.city} {address.postcode}</p><span>{address.phone}</span>
        <button onClick={() => removeAddress(address.id)}><Trash /> Remove</button>
      </article>)}</div>
    </section>
  );
}

function AdminDashboard({ catalog, setCatalog, orders }) {
  const [view, setView] = useState("overview");
  const [draft, setDraft] = useState({ name: "", sku: "", category: categoryMeta[0].name, price: "", stock: "", image: categoryMeta[0].image, description: "Premium electronics product." });
  const [coupons, setCoupons] = useState(demoCoupons);
  const [customers, setCustomers] = useState(demoCustomers);
  const [couponDraft, setCouponDraft] = useState({ code: "", discountType: "percent", discountValue: 10, minimumOrder: 50 });
  const stockValue = catalog.reduce((sum, item) => sum + Number(item.stock || 0), 0);
  useEffect(() => {
    apiRequest("/api/admin/customers").then((response) => response.customers?.length && setCustomers(response.customers)).catch(() => {});
    apiRequest("/api/admin/coupons").then((response) => response.coupons?.length && setCoupons(response.coupons)).catch(() => {});
  }, []);
  const updateProduct = async (id, patch) => {
    setCatalog((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
    try { await apiRequest(`/api/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(patch) }); } catch { /* Local preview remains interactive. */ }
  };
  const createProduct = async (event) => {
    event.preventDefault();
    const product = {
      ...draft, id: Math.max(...catalog.map((item) => item.id)) + 1,
      price: Number(draft.price), stock: Number(draft.stock), currency: "BDT",
      active: true, featured: false, rating: 0, reviews: 0, badge: "New",
    };
    setCatalog((items) => [product, ...items]);
    setDraft({ ...draft, name: "", sku: "", price: "", stock: "" });
    try { await apiRequest("/api/admin/products", { method: "POST", body: JSON.stringify(product) }); } catch { /* Local preview remains interactive. */ }
  };
  const createCoupon = async (event) => {
    event.preventDefault();
    const coupon = { ...couponDraft, id: Date.now(), code: couponDraft.code.toUpperCase(), active: true, usedCount: 0, usageLimit: null };
    setCoupons((items) => [coupon, ...items]);
    setCouponDraft({ code: "", discountType: "percent", discountValue: 10, minimumOrder: 50 });
    try { await apiRequest("/api/admin/coupons", { method: "POST", body: JSON.stringify(coupon) }); } catch { /* Local preview remains interactive. */ }
  };
  const toggleCoupon = async (coupon) => {
    setCoupons((items) => items.map((item) => item.id === coupon.id ? { ...item, active: !item.active } : item));
    try { await apiRequest(`/api/admin/coupons/${coupon.id}`, { method: "PATCH", body: JSON.stringify({ active: !coupon.active }) }); } catch { /* Local preview remains interactive. */ }
  };
  return (
    <main className="shell admin-page">
      <header className="admin-heading"><div><p>Store operations</p><h1>Commerce control center</h1><span>Products, inventory, orders and fulfillment health in one workspace.</span></div><button className="primary-button" onClick={() => setView("add")}><Plus /> Add product</button></header>
      <nav className="admin-tabs"><button className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}><TrendUp /> Overview</button><button className={view === "inventory" ? "active" : ""} onClick={() => setView("inventory")}><Cube /> Inventory</button><button className={view === "orders" ? "active" : ""} onClick={() => setView("orders")}><Package /> Orders</button><button className={view === "customers" ? "active" : ""} onClick={() => setView("customers")}><UsersThree /> Customers</button><button className={view === "coupons" ? "active" : ""} onClick={() => setView("coupons")}><Tag /> Coupons</button></nav>
      {view === "overview" && (
        <>
          <section className="admin-metrics">
            <article><span>Revenue</span><strong>{money(48230.86)}</strong><b>+12.8% this month</b><TrendUp /></article>
            <article><span>Orders</span><strong>{orders.length + 124}</strong><b>18 awaiting shipment</b><Package /></article>
            <article><span>Inventory</span><strong>{stockValue}</strong><b>{catalog.filter((p) => p.stock < 15).length} low-stock items</b><Cube /></article>
            <article><span>Checkout methods</span><strong>2 active</strong><b>COD and bank transfer</b><ShieldCheck /></article>
          </section>
          <div className="admin-split">
            <section><div className="account-section-head"><div><p>Attention needed</p><h2>Low inventory</h2></div><button onClick={() => setView("inventory")}>Manage all</button></div>{catalog.filter((p) => p.stock < 20).slice(0, 5).map((product) => <div className="stock-alert" key={product.id}><img src={product.image} alt="" /><div><strong>{product.name}</strong><span>{product.sku || `BJ-${product.id}`}</span></div><b>{product.stock} left</b></div>)}</section>
            <section><div className="account-section-head"><div><p>Latest activity</p><h2>Recent orders</h2></div><button onClick={() => setView("orders")}>View all</button></div>{orders.slice(0, 5).map((order) => <div className="stock-alert" key={order.id}><div className="mini-order"><Package /></div><div><strong>{order.orderNumber}</strong><span>{order.status}</span></div><b>{money(order.total)}</b></div>)}</section>
          </div>
        </>
      )}
      {view === "inventory" && (
        <section className="inventory-panel">
          <div className="account-section-head"><div><p>Live catalog</p><h2>Product inventory</h2></div><span>{catalog.length} products</span></div>
          <div className="inventory-table">
            <div className="inventory-row table-head"><span>Product</span><span>Price</span><span>Stock</span><span>Status</span><span>Actions</span></div>
            {catalog.map((product) => (
              <div className="inventory-row" key={product.id}>
                <div className="inventory-product"><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{product.sku || `BJ-${product.id}`}</small></span></div>
                <label className="admin-price"><span>৳</span><input value={product.price} onChange={(e) => updateProduct(product.id, { price: Number(e.target.value) })} /></label>
                <div className="admin-stock"><button onClick={() => updateProduct(product.id, { stock: Math.max(0, Number(product.stock || 0) - 1) })}><Minus /></button><strong>{product.stock || 0}</strong><button onClick={() => updateProduct(product.id, { stock: Number(product.stock || 0) + 1 })}><Plus /></button></div>
                <button className={`status-toggle ${product.active !== false ? "active" : ""}`} onClick={() => updateProduct(product.id, { active: product.active === false })}>{product.active === false ? "Hidden" : "Active"}</button>
                <button className="edit-product"><PencilSimple /> Edit</button>
              </div>
            ))}
          </div>
        </section>
      )}
      {view === "orders" && <OrderHistory orders={orders} />}
      {view === "customers" && (
        <section className="inventory-panel">
          <div className="account-section-head"><div><p>Customer relationships</p><h2>Customer directory</h2></div><span>{customers.length} customers</span></div>
          <div className="customer-table">
            <div className="customer-row table-head"><span>Customer</span><span>Contact</span><span>Orders</span><span>Lifetime value</span><span>Joined</span></div>
            {customers.map((customer) => <div className="customer-row" key={customer.id}>
              <div className="customer-name"><i>{customer.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</i><strong>{customer.name}</strong></div>
              <div><strong>{customer.email}</strong><small>{customer.phone}</small></div><b>{customer.orderCount}</b><b>{money(customer.lifetimeValue)}</b><span>{new Date(customer.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>)}
          </div>
        </section>
      )}
      {view === "coupons" && (
        <div className="coupon-layout">
          <section className="inventory-panel">
            <div className="account-section-head"><div><p>Promotions</p><h2>Coupon campaigns</h2></div><span>{coupons.filter((coupon) => coupon.active).length} active</span></div>
            <div className="coupon-list">{coupons.map((coupon) => <article key={coupon.id}>
              <div className="coupon-mark"><Tag weight="duotone" /></div><div><strong>{coupon.code}</strong><span>{coupon.discountType === "percent" ? `${coupon.discountValue}% off` : money(coupon.discountValue)} · Minimum {money(coupon.minimumOrder)}</span></div>
              <div><strong>{coupon.usedCount}</strong><span>redemptions</span></div>
              <button className={`status-toggle ${coupon.active ? "active" : ""}`} onClick={() => toggleCoupon(coupon)}>{coupon.active ? "Active" : "Paused"}</button>
            </article>)}</div>
          </section>
          <section className="coupon-create">
            <div className="account-section-head"><div><p>New promotion</p><h2>Create coupon</h2></div></div>
            <form onSubmit={createCoupon}>
              <label><span>Coupon code</span><input required value={couponDraft.code} onChange={(e) => setCouponDraft({ ...couponDraft, code: e.target.value.toUpperCase() })} placeholder="SUMMER25" /></label>
              <label><span>Discount type</span><select value={couponDraft.discountType} onChange={(e) => setCouponDraft({ ...couponDraft, discountType: e.target.value })}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label>
              <label><span>Discount value</span><input required type="number" min="1" value={couponDraft.discountValue} onChange={(e) => setCouponDraft({ ...couponDraft, discountValue: Number(e.target.value) })} /></label>
              <label><span>Minimum order</span><input required type="number" min="0" value={couponDraft.minimumOrder} onChange={(e) => setCouponDraft({ ...couponDraft, minimumOrder: Number(e.target.value) })} /></label>
              <button className="primary-button"><Plus /> Create coupon</button>
            </form>
          </section>
        </div>
      )}
      {view === "add" && (
        <section className="add-product-panel">
          <div className="account-section-head"><div><p>Catalog management</p><h2>Add a new product</h2></div></div>
          <form onSubmit={createProduct}>
            <label><span>Product name</span><input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
            <label><span>SKU</span><input required value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} /></label>
            <label><span>Category</span><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{categoryMeta.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
            <label><span>Image asset</span><select value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })}>{categoryMeta.map((item) => <option key={item.image} value={item.image}>{item.name} image</option>)}</select></label>
            <label><span>Price</span><input required type="number" min="1" step=".01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></label>
            <label><span>Opening stock</span><input required type="number" min="0" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} /></label>
            <label className="wide"><span>Description</span><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
            <div className="wide form-actions"><button type="button" onClick={() => setView("inventory")}>Cancel</button><button className="primary-button"><Plus /> Create product</button></div>
          </form>
        </section>
      )}
    </main>
  );
}

function ProfilePage({ authUser, setAuthUser, orders, catalog, setCatalog, favorites, toggleFavorite, openProduct, addToCart }) {
  const [section, setSection] = useState("orders");
  if (!authUser) return <AuthPanel onAuthenticated={setAuthUser} />;
  if (authUser.role === "admin") return (
    <main className="shell profile-page"><section className="account-empty"><ShieldCheck size={48} weight="duotone" /><h3>Administrator access has moved</h3><p>Store operations now use a separate protected administration portal.</p><a className="primary-button" href={adminLoginUrl}>Open BJ Admin <ArrowSquareOut /></a></section></main>
  );
  return (
    <main className="shell profile-page">
      <section className="profile-hero">
        <UserCircle size={82} weight="duotone" />
        <div><p>Premium member</p><h1>Welcome, {authUser.name}</h1><span>{authUser.email}</span></div>
        <button onClick={() => setAuthUser(null)}><SignOut /> Sign out</button>
      </section>
      <div className="profile-stats"><button onClick={() => setSection("orders")} className={section === "orders" ? "active" : ""}><b>{orders.length}</b><span>Orders</span></button><button onClick={() => setSection("wishlist")} className={section === "wishlist" ? "active" : ""}><b>{favorites.length}</b><span>Wishlist</span></button><button onClick={() => setSection("addresses")} className={section === "addresses" ? "active" : ""}><b>{demoAddresses.length}</b><span>Addresses</span></button></div>
      <nav className="account-tabs">
        <button className={section === "orders" ? "active" : ""} onClick={() => setSection("orders")}><Package /> Orders & tracking</button>
        <button className={section === "wishlist" ? "active" : ""} onClick={() => setSection("wishlist")}><Heart /> Wishlist</button>
        <button className={section === "addresses" ? "active" : ""} onClick={() => setSection("addresses")}><AddressBook /> Addresses</button>
      </nav>
      {section === "orders" && <OrderHistory orders={orders} />}
      {section === "wishlist" && <WishlistPanel catalog={catalog} favorites={favorites} toggleFavorite={toggleFavorite} openProduct={openProduct} addToCart={addToCart} />}
      {section === "addresses" && <AddressPanel initialAddresses={demoAddresses} authUser={authUser} />}
    </main>
  );
}

function Footer({ setPage }) {
  return (
    <footer className="footer">
      <div className="shell footer-grid">
        <div className="footer-brand"><Logo onClick={() => setPage("home")} /><p>Your trusted destination for premium electronics and smarter everyday technology.</p></div>
        <div><strong>Shop</strong><button onClick={() => setPage("Television")}>Television</button><button onClick={() => setPage("Home Appliances")}>Home appliances</button><button onClick={() => setPage("Refrigerator & Freezer")}>Refrigerators</button><button onClick={() => setPage("Portable Power Station (IPS)")}>Portable power</button></div>
        <div><strong>Customer service</strong><button>Contact us</button><button onClick={() => setPage("profile")}>Track order</button><button>Returns & refunds</button><button>Shipping info</button></div>
        <div><strong>Company</strong><button>About us</button><button>Careers</button><button>Privacy policy</button><button>Terms</button></div>
      </div>
      <div className="shell copyright"><span>© 2026 BJ Electronics. All rights reserved.</span><span>Smart tech, better life.</span></div>
    </footer>
  );
}

function MobileNav({ page, setPage, cartCount }) {
  const items = [[House, "home", "Home"], [Storefront, "categories", "Categories"], [ShoppingCart, "cart", "Cart"], [User, "profile", "Profile"]];
  return (
    <nav className="mobile-nav">
      {items.map(([Icon, target, label]) => <button key={target} onClick={() => setPage(target)} className={page === target ? "active" : ""}><Icon weight={page === target ? "fill" : "regular"} /><span>{label}</span>{target === "cart" && cartCount > 0 && <b>{cartCount}</b>}</button>)}
    </nav>
  );
}

export function App() {
  const [page, setPage] = useState("home");
  const [selectedProduct, setSelectedProduct] = useState(products[0]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("bj-cart"));
      const valid = Array.isArray(stored) ? stored.filter((item) => products.some((product) => product.id === item.id)) : [];
      return valid.length ? valid : [products[0], products[1]];
    } catch { return [products[0], products[1]]; }
  });
  const [checkoutIntent, setCheckoutIntent] = useState(null);
  const [notice, setNotice] = useState("");
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("bj-wishlist"));
      const valid = Array.isArray(stored) ? stored.filter((id) => products.some((product) => product.id === id)) : [];
      return valid.length ? valid : [products[2].id, products[5].id, products[6].id];
    } catch { return [products[2].id, products[5].id, products[6].id]; }
  });
  const [compareIds, setCompareIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bj-compare")) || []; } catch { return []; }
  });
  const [compareOpen, setCompareOpen] = useState(false);
  const [recentIds, setRecentIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bj-recently-viewed")) || []; } catch { return []; }
  });
  const [savedIds, setSavedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bj-saved-later")) || []; } catch { return []; }
  });
  const [catalog, setCatalog] = useState(products.map((product) => ({
    ...product,
    sku: product.sku || `BJ-${product.category.slice(0, 3).toUpperCase()}-${String(product.id).padStart(3, "0")}`,
    stock: product.stock ?? 0,
    active: true,
  })));
  const [authUser, setAuthUserState] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bj-auth-user")) || null; } catch { return null; }
  });
  const [orders, setOrders] = useState(demoOrders);
  const setAuthUser = (user) => {
    setAuthUserState(user);
    if (user) {
      localStorage.setItem("bj-auth-user", JSON.stringify(user));
      if (checkoutIntent) {
        setCheckoutIntent((intent) => ({ ...intent, autoOpen: true }));
        setPage("cart");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
    else {
      localStorage.removeItem("bj-auth-user");
      apiRequest("/api/auth/logout", { method: "POST" }).catch(() => {});
    }
  };
  useEffect(() => {
    localStorage.setItem("bj-cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    apiRequest("/api/products").then((response) => {
      if (response.products?.length) setCatalog(response.products.map((product) => ({ ...product, badge: product.availability === "preorder" ? "Pre-order" : product.featured ? "Featured" : "In stock", rating: 0, reviews: 0 })));
    }).catch(() => {});
    if (authUser) {
      apiRequest("/api/orders").then((response) => {
        if (response.orders?.length) setOrders(response.orders);
      }).catch(() => {});
    }
  }, [authUser?.id]);
  const visibleProducts = catalog.filter((product) => product.active !== false && [product.name, product.category, product.subcategory, product.brand].some((value) => String(value || "").toLowerCase().includes(search.toLowerCase())));
  const compareProducts = compareIds.map((id) => catalog.find((product) => product.id === id)).filter(Boolean);
  const recentlyViewed = recentIds.map((id) => catalog.find((product) => product.id === id)).filter(Boolean).slice(0, 4);
  const savedProducts = savedIds.map((id) => catalog.find((product) => product.id === id)).filter(Boolean);
  const openProduct = (product) => {
    setSelectedProduct(product);
    setRecentIds((items) => {
      const next = [product.id, ...items.filter((id) => id !== product.id)].slice(0, 4);
      localStorage.setItem("bj-recently-viewed", JSON.stringify(next));
      return next;
    });
    setPage("product");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const addToCart = (product, quantity = 1) => {
    setCart((items) => {
      const current = items.filter((item) => item.id === product.id).length;
      const allowed = Math.max(0, Math.min(quantity, 10 - current));
      return [...items, ...Array.from({ length: allowed }, () => product)];
    });
    setNotice(`${product.name} added to your cart.`);
  };
  const buyNow = (product, quantity = 1) => {
    const items = Array.from({ length: Math.min(10, Math.max(1, quantity)) }, () => product);
    setCheckoutIntent({ id: `${product.id}-${Date.now()}`, source: "buy-now", items, autoOpen: Boolean(authUser) });
    setPage(authUser ? "cart" : "profile");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const toggleCompare = (id) => setCompareIds((items) => {
    if (items.includes(id)) {
      const next = items.filter((item) => item !== id);
      localStorage.setItem("bj-compare", JSON.stringify(next));
      if (next.length < 2) setCompareOpen(false);
      return next;
    }
    if (items.length >= 3) {
      setNotice("Comparison is limited to three products.");
      return items;
    }
    const next = [...items, id];
    localStorage.setItem("bj-compare", JSON.stringify(next));
    return next;
  });
  const clearCompare = () => {
    setCompareIds([]);
    setCompareOpen(false);
    localStorage.removeItem("bj-compare");
  };
  const saveForLater = (product) => setSavedIds((items) => {
    const next = items.includes(product.id) ? items : [product.id, ...items];
    localStorage.setItem("bj-saved-later", JSON.stringify(next));
    setNotice(`${product.name} saved for later.`);
    return next;
  });
  const removeSaved = (id) => setSavedIds((items) => {
    const next = items.filter((item) => item !== id);
    localStorage.setItem("bj-saved-later", JSON.stringify(next));
    return next;
  });
  const moveSavedToCart = (product) => {
    addToCart(product);
    removeSaved(product.id);
  };
  const requireCheckoutAuth = (items) => {
    setCheckoutIntent({ id: `cart-${Date.now()}`, source: "cart", items, autoOpen: false });
  };
  const updateCheckoutItems = (items) => setCheckoutIntent((intent) => intent ? { ...intent, items } : null);
  const markCheckoutOpened = () => setCheckoutIntent((intent) => intent ? { ...intent, autoOpen: false } : null);
  const completeCheckoutIntent = (orderCompleted) => {
    if (orderCompleted && (!checkoutIntent || checkoutIntent.source === "cart")) setCart([]);
    setCheckoutIntent(null);
  };
  const toggleFavorite = (id) => setFavorites((items) => {
    const next = items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
    localStorage.setItem("bj-wishlist", JSON.stringify(next));
    if (authUser) apiRequest(`/api/account/wishlist/${id}`, { method: items.includes(id) ? "DELETE" : "POST" }).catch(() => {});
    return next;
  });
  const navigate = (target) => { setPage(target); window.scrollTo({ top: 0, behavior: "smooth" }); };
  let content;
  if (page === "home") content = <Home products={catalog} visibleProducts={visibleProducts} setPage={navigate} openProduct={openProduct} addToCart={addToCart} buyNow={buyNow} toggleFavorite={toggleFavorite} favorites={favorites} toggleCompare={toggleCompare} compareIds={compareIds} recentlyViewed={recentlyViewed} />;
  else if (page === "product") content = <ProductPage product={selectedProduct} catalog={catalog} openProduct={openProduct} addToCart={addToCart} buyNow={buyNow} toggleFavorite={toggleFavorite} isFavorite={favorites.includes(selectedProduct.id)} toggleCompare={toggleCompare} compareIds={compareIds} authUser={authUser} onSignIn={() => navigate("profile")} />;
  else if (page === "cart") content = <CartPage cart={cart} setCart={setCart} setPage={navigate} openProduct={openProduct} authUser={authUser} checkoutIntent={checkoutIntent} onCheckoutItemsChange={updateCheckoutItems} onCheckoutOpened={markCheckoutOpened} onCheckoutAuthRequired={requireCheckoutAuth} onCheckoutComplete={completeCheckoutIntent} savedProducts={savedProducts} onSaveForLater={saveForLater} onMoveSavedToCart={moveSavedToCart} onRemoveSaved={removeSaved} onOrderPlaced={(order) => setOrders((items) => [order, ...items])} />;
  else if (page === "profile") content = <ProfilePage authUser={authUser} setAuthUser={setAuthUser} orders={orders} catalog={catalog} setCatalog={setCatalog} favorites={favorites} toggleFavorite={toggleFavorite} openProduct={openProduct} addToCart={addToCart} />;
  else content = <CategoryPage category={page} query={search} openProduct={openProduct} addToCart={addToCart} buyNow={buyNow} toggleFavorite={toggleFavorite} favorites={favorites} catalog={catalog} toggleCompare={toggleCompare} compareIds={compareIds} />;
  return (
    <div className="app-shell">
      <Header page={page} setPage={navigate} search={search} setSearch={setSearch} cartCount={cart.length} favorites={favorites.length} authUser={authUser} />
      {content}
      <Footer setPage={navigate} />
      <MobileNav page={page} setPage={navigate} cartCount={cart.length} />
      {notice && <div className="commerce-toast" role="status"><i><Check weight="bold" /></i><span><strong>Shopping update</strong>{notice}</span></div>}
      {compareProducts.length > 0 && <CompareTray items={compareProducts} remove={toggleCompare} clear={clearCompare} open={() => setCompareOpen(true)} />}
      {compareOpen && <CompareModal items={compareProducts} close={() => setCompareOpen(false)} remove={toggleCompare} openProduct={openProduct} addToCart={addToCart} buyNow={buyNow} />}
    </div>
  );
}
