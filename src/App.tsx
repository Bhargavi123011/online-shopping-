import { useEffect, useMemo, useRef, useState } from 'react';

type Product = {
  name: string;
  brand: string;
  category: string;
  price: number;
  currency: string;
  source: string;
  productUrl: string;
  images: string[];
  variants: { id: string; color: string; availableSizes: string[] }[];
  availableSizes: string[];
  sizeChart: { size: string; chest?: number; waist?: number; hip?: number; shoulder?: number; inseam?: number; length?: number }[];
  description: string;
  reliability: string;
  isEstimated: boolean;
};

type Recommendation = {
  recommendedSize: string;
  fit: string;
  reason: string;
  details: { size: string; score: number; match: boolean }[];
  selectedSize: string;
  why: {
    title: string;
    description: string;
    breakdown: { size: string; chest: string; waist: string }[];
  };
};

const defaultProduct: Product = {
  name: 'AeroFlex Everyday Tee',
  brand: 'Myntra',
  category: 'T-shirt',
  price: 2199,
  currency: 'INR',
  source: 'Product page',
  productUrl: 'https://www.myntra.com/men-tshirts',
  images: [
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
  ],
  variants: [{ id: 'default', color: 'Midnight Navy', availableSizes: ['S', 'M', 'L', 'XL'] }],
  availableSizes: ['S', 'M', 'L', 'XL'],
  sizeChart: [
    { size: 'S', chest: 38, waist: 32, shoulder: 17, length: 28 },
    { size: 'M', chest: 40, waist: 34, shoulder: 17.5, length: 29 },
    { size: 'L', chest: 42, waist: 36, shoulder: 18, length: 30 },
    { size: 'XL', chest: 44, waist: 38, shoulder: 18.5, length: 31 },
  ],
  description: 'Premium everyday tee designed with a breathable knit, structured shoulders, and a regular fit.',
  reliability: 'Product detail source: public product metadata',
  isEstimated: false,
};

const sizeStyles: Record<string, { width: number; height: number }> = {
  S: { width: 170, height: 230 },
  M: { width: 190, height: 250 },
  L: { width: 210, height: 270 },
  XL: { width: 230, height: 290 },
};

const steps = [
  { title: '1. Paste product link', text: 'Use a supported e-commerce URL to begin product verification.' },
  { title: '2. Review product details', text: 'Check the extracted data, adjust if needed, and confirm the product.' },
  { title: '3. Check live body fit', text: 'Use the camera and estimate your measurements before sizing.' },
  { title: '4. Try on in your size', text: 'Compare sizes, preview fit, and see the AI-generated final result.' },
];

const cameraGuidance = [
  'Stand about 1.5 to 2 meters away from the camera.',
  'Keep your full body in frame and face the camera directly.',
  'Use good lighting and avoid heavy scarves, bags, or loose outerwear.',
  'Only one person should be visible for the best result.',
];

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [url, setUrl] = useState('https://www.myntra.com/men-tshirts/solid-knit-tee');
  const [product, setProduct] = useState<Product | null>(defaultProduct);
  const [message, setMessage] = useState('Ready to check this product.');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'landing' | 'review' | 'camera' | 'result'>('landing');
  const [measurements, setMeasurements] = useState({ chest: 94, waist: 82, hip: 96, shoulder: 40, height: 170 });
  const [selectedSize, setSelectedSize] = useState('M');
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [finalResult, setFinalResult] = useState<any>(null);
  const [consent, setConsent] = useState(true);

  useEffect(() => {
    if (stage === 'camera') {
      void startCamera();
    }
  }, [stage]);

  const productSummary = useMemo(() => {
    const base = product ?? defaultProduct;
    return `${base.brand} · ${base.category} · ${base.price} ${base.currency}`;
  }, [product]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setMessage('Camera permission was not granted. You can upload an image or continue with estimated measurements.');
    }
  }

  async function analyzeUrl() {
    setLoading(true);
    setMessage('Validating product link and extracting details...');

    try {
      const response = await fetch('/api/products/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();

      if (!data.success) {
        setMessage(data.message || 'Unable to validate this product.');
        setStage('landing');
        return;
      }

      setProduct(data.product);
      setMessage('Product validated. Review and confirm before continuing.');
      setStage('review');
    } catch {
      setMessage('A network issue occurred while checking the product link.');
      setStage('landing');
    } finally {
      setLoading(false);
    }
  }

  async function analyzeBody() {
    setLoading(true);
    setMessage('Preparing virtual try-on... Detecting body and estimating measurements.');

    try {
      const response = await fetch('/api/body/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: product?.category || 'T-shirt',
          userProfile: { heightCm: measurements.height, gender: 'unspecified' },
        }),
      });
      const data = await response.json();
      setMeasurements((current) => ({ ...current, ...data.measurements }));
      setMessage('Body analysis completed. You can adjust the estimated values before sizing.');
      setStage('camera');
    } catch {
      setMessage('Low-confidence body analysis. You can continue with estimated measurements.');
      setStage('camera');
    } finally {
      setLoading(false);
    }
  }

  async function calculateRecommendation() {
    setLoading(true);
    try {
      const response = await fetch('/api/recommendation/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: product?.category || 'T-shirt',
          measurements,
          sizeChart: product?.sizeChart || defaultProduct.sizeChart,
        }),
      });
      const data: Recommendation = await response.json();
      setRecommendation(data);
      setSelectedSize(data.selectedSize);
      setMessage('Recommended size has been calculated.');
    } catch {
      setMessage('Recommendation could not be calculated. Please review the measurements.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectSize(size: string) {
    setSelectedSize(size);
    const res = await fetch('/api/tryon/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedSize: size, product: { category: product?.category || 'T-shirt', color: 'Midnight Navy' } }),
    });
    const data = await res.json();
    setFinalResult({ ...data, selectedSize: size });
  }

  async function generateResult() {
    if (!recommendation) {
      await calculateRecommendation();
    }

    setStage('result');
    setFinalResult({
      product: product || defaultProduct,
      selectedSize,
      fit: recommendation?.fit || 'Recommended / Regular fit',
      why: recommendation?.why || {
        title: 'Why this size?',
        description: 'Your measurements fit best in this size range.',
        breakdown: [],
      },
      notice: 'AI-generated result — original details may be estimated from available product information.',
    });
  }

  async function saveResult() {
    try {
      await fetch('/api/results/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name: product?.name || defaultProduct.name,
            brand: product?.brand || defaultProduct.brand,
            category: product?.category || defaultProduct.category,
            price: product?.price || defaultProduct.price,
            currency: product?.currency || defaultProduct.currency,
            url: product?.productUrl || defaultProduct.productUrl,
          },
          recommendation: {
            recommendedSize: recommendation?.recommendedSize || selectedSize,
            selectedSize,
            fit: recommendation?.fit || 'Recommended / Regular fit',
          },
        }),
      });
      setMessage('Result saved to your privacy-aware history.');
    } catch {
      setMessage('Unable to save result in this demo environment.');
    }
  }

  const activeStage = stage === 'landing' ? 0 : stage === 'review' ? 1 : stage === 'camera' ? 2 : 3;

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <div className="brand-badge">StyleFit</div>
          <span>Personalized fit preview</span>
        </div>
        <nav>
          <button className="ghost-button">Privacy</button>
          <button className="ghost-button">History</button>
          <button className="primary-button">Login</button>
        </nav>
      </header>

      <main className="content-wrap">
        {stage === 'landing' && (
          <>
            <section className="hero-card">
              <div className="hero-text">
                <p className="eyebrow">A better fit, less guesswork</p>
                <h1>Know your size before you order.</h1>
                <p className="hero-subtext">
                  Review the product, estimate your measurements, compare size charts, and preview the garment using a guided, size-aware fit experience.
                </p>
                <div className="input-row">
                  <input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="Paste Myntra, AJIO, Amazon or Flipkart product URL"
                  />
                  <button className="primary-button" onClick={analyzeUrl} disabled={loading}>
                    {loading ? 'Checking...' : 'Verify Product'}
                  </button>
                </div>
                <div className="disclaimer">
                  <span className="status-dot" />
                  {message}
                </div>
              </div>

              <div className="stack-card">
                <div className="mini-label">Supported platforms</div>
                <ul className="platform-list">
                  <li>Myntra</li>
                  <li>AJIO</li>
                  <li>Amazon</li>
                  <li>Flipkart</li>
                </ul>
                <div className="consent-box">
                  <label>
                    <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                    I agree that camera data will be used for body estimation and that AI-generated results may be estimates.
                  </label>
                </div>
                <div className="mini-note">
                  <strong>Privacy notice:</strong> Images are not stored unless you choose to save a result.
                </div>
              </div>
            </section>

            <section className="info-panel">
              <div className="panel-header big-gap">
                <h3>How this works</h3>
                <span className="pill">4 steps</span>
              </div>
              <div className="stepper">
                {steps.map((step, index) => (
                  <div key={step.title} className={index === activeStage ? 'step-card active' : 'step-card'}>
                    <div className="step-number">{index + 1}</div>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {stage === 'review' && product && (
          <section className="panel-grid">
            <div className="panel product-panel">
              <div className="panel-header">
                <h2>Product review</h2>
                <span className="pill">{product.isEstimated ? 'Estimated' : 'Verified source'}</span>
              </div>
              <div className="product-gallery">
                {product.images.map((image) => (
                  <img key={image} src={image} alt={product.name} />
                ))}
              </div>
              <div className="info-grid">
                <label>
                  Product name
                  <input value={product.name} onChange={() => undefined} />
                </label>
                <label>
                  Brand
                  <input value={product.brand} onChange={() => undefined} />
                </label>
                <label>
                  Category
                  <input value={product.category} onChange={() => undefined} />
                </label>
                <label>
                  Price
                  <input value={`${product.price} ${product.currency}`} onChange={() => undefined} />
                </label>
              </div>
              <p className="muted-text">{product.description}</p>
              <p className="muted-text">{product.reliability}</p>
              <div className="callout info">Product details are user-reviewable before continuing. Adjust any incorrect values before sizing.</div>
              <button className="primary-button wide" onClick={analyzeBody}>Try On</button>
            </div>

            <aside className="panel side-panel">
              <div className="panel-header">
                <h3>Size chart</h3>
              </div>
              <div className="size-chart-box">
                {product.sizeChart.map((row) => (
                  <div key={row.size} className="size-row">
                    <span>{row.size}</span>
                    <span>{row.chest ?? row.waist ?? '--'}</span>
                    <span>{row.waist ?? row.length ?? '--'}</span>
                  </div>
                ))}
              </div>
              <div className="callout warning">
                AI-generated back view — original product image was not available.
              </div>
              <div className="mini-note">
                <strong>Current product:</strong> {productSummary}
              </div>
            </aside>
          </section>
        )}

        {stage === 'camera' && (
          <section className="panel-grid camera-stage">
            <div className="panel tryon-panel">
              <div className="camera-header">
                <div>
                  <p className="eyebrow">Live body analysis</p>
                  <h2>Preparing virtual try-on...</h2>
                </div>
                <button className="secondary-button" onClick={() => setStage('camera')}>Try Again</button>
              </div>
              <div className="camera-box">
                <video ref={videoRef} autoPlay playsInline muted />
                <div
                  className="garment-overlay"
                  style={{
                    width: `${sizeStyles[selectedSize]?.width ?? 190}px`,
                    height: `${sizeStyles[selectedSize]?.height ?? 250}px`,
                    background: '#315b48',
                  }}
                />
              </div>
            </div>

            <aside className="panel side-panel measurement-panel">
              <div className="panel-header">
                <h3>Measurements</h3>
                <button className="ghost-button" onClick={() => setStage('review')}>Edit Measurements</button>
              </div>

              <div className="guidance-list">
                {cameraGuidance.map((item) => (
                  <div key={item} className="guidance-item">{item}</div>
                ))}
              </div>

              <div className="measurement-grid">
                {Object.entries(measurements).map(([key, value]) => (
                  <label key={key}>
                    {key}
                    <input
                      type="number"
                      value={value}
                      onChange={(event) =>
                        setMeasurements((current) => ({
                          ...current,
                          [key]: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <button className="primary-button wide" onClick={calculateRecommendation}>Recommend Size</button>
              <div className="callout info">{message}</div>
            </aside>
          </section>
        )}

        {recommendation && (
          <section className="panel recommendation-panel">
            <div className="panel-header">
              <h3>Selected size</h3>
            </div>
            <div className="size-selector">
              {['S', 'M', 'L', 'XL'].map((size) => (
                <button
                  key={size}
                  className={size === selectedSize ? 'size-pill selected' : 'size-pill'}
                  onClick={() => handleSelectSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
            <div className="recommendation-box">
              <div>
                <p className="eyebrow">Recommended Size</p>
                <h2>{recommendation.recommendedSize}</h2>
              </div>
              <div>
                <p className="eyebrow">Fit result</p>
                <h3>{recommendation.fit}</h3>
              </div>
            </div>
            <div className="why-box">
              <h4>{recommendation.why.title}</h4>
              <p>{recommendation.why.description}</p>
              <div className="why-list">
                {recommendation.why.breakdown.map((item) => (
                  <div key={item.size} className="why-row">
                    <span>{item.size}</span>
                    <span>{item.chest}</span>
                    <span>{item.waist}</span>
                  </div>
                ))}
              </div>
            </div>
            <button className="primary-button wide" onClick={generateResult}>Generate Final Result</button>
          </section>
        )}

        {stage === 'result' && finalResult && (
          <section className="result-grid">
            <div className="panel result-image-panel">
              <div className="panel-header">
                <h2>Final result</h2>
                <span className="pill">{finalResult.selectedSize}</span>
              </div>
              <div className="result-visual">
                <img src={finalResult.product.images[0]} alt={finalResult.product.name} />
                <div className="result-ghost" />
              </div>
              <div className="result-meta">
                <div>
                  <strong>{finalResult.product.name}</strong>
                  <p>{finalResult.product.brand}</p>
                </div>
                <div>
                  <strong>{finalResult.selectedSize}</strong>
                  <p>{finalResult.fit}</p>
                </div>
              </div>
            </div>

            <aside className="panel side-panel">
              <div className="panel-header">
                <h3>Details</h3>
              </div>
              <ul className="result-list">
                <li>Recommended size: {recommendation?.recommendedSize || selectedSize}</li>
                <li>Fit result: {finalResult.fit}</li>
                <li>Source and reliability: {finalResult.product.reliability}</li>
                <li>Size chart status: {finalResult.product.isEstimated ? 'Estimated size chart' : 'Product-provided size chart'}</li>
                <li>Generated result: {finalResult.notice}</li>
              </ul>
              <div className="action-row">
                <button className="primary-button" onClick={saveResult}>Save Result</button>
                <button className="ghost-button">Download</button>
              </div>
            </aside>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
