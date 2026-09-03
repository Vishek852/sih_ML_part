# FreqGuard — AI-Generated Image Detection Service

Dual-branch spatial-frequency CNN for detecting deepfake and AI-generated
images. This service exposes the trained model as a FastAPI inference API,
consumed by the Cooperative Gig Services Platform backend via a `/predict`
proxy route.

## Overview

FreqGuard analyzes an input image on two branches — spatial (RGB pixel
patterns) and frequency domain (FFT/DCT artifacts introduced by generative
models) — and fuses both to classify the image as **real** or
**AI-generated**, with a confidence score.

## Tech Stack

- Python 3.10+
- FastAPI + Uvicorn
- PyTorch (model + inference)
- Pillow / NumPy / OpenCV (image preprocessing)

## Project Structure

```
freqguard-ml/
├── main.py                # FastAPI app, routes
├── model/
│   ├── freqguard.py       # model architecture (dual-branch CNN)
│   └── weights/           # trained model weights (see Model Weights below)
├── inference/
│   ├── preprocess.py      # image preprocessing / FFT transform
│   └── predict.py         # inference pipeline
├── requirements.txt
├── .env.example
└── README.md
```

## Setup

### 1. Clone and install dependencies

```bash
git clone <this-repo-url>
cd freqguard-ml
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in as needed:
```
MODEL_PATH=model/weights/freqguard.pt
PORT=8000
```

### 3. Run locally

```bash
uvicorn main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs` (FastAPI's auto-generated
Swagger UI).

## API Endpoints

### `GET /health`
Health check used by the hosting platform and uptime monitoring.
```json
{ "status": "ok", "service": "ml" }
```

### `POST /predict`
Runs inference on a single image.

**Request:** `multipart/form-data` with an `image` file field.

**Response:**
```json
{
  "label": "ai_generated",
  "confidence": 0.94,
  "spatial_score": 0.91,
  "frequency_score": 0.97
}
```

## Model Weights

Trained weights are **not committed to this repo** (keeps clones/deploys
fast). Before running:
- Local dev: place `freqguard.pt` in `model/weights/`
- Deployment: weights are hosted on [Hugging Face Hub / your storage of
  choice] and downloaded automatically on container startup — see
  `model/download_weights.py`

## Deployment

Deployed on Render (free tier) as a standalone web service:
```
Build command: pip install -r requirements.txt
Start command: uvicorn main:app --host 0.0.0.0 --port $PORT
Health check:  /health
```

The backend service calls this API via the `AI_SERVICE_URL` environment
variable — this service is never called directly from the frontend.

## Dataset & Training

Trained on a combined dataset of real photographs and AI-generated images
sourced from [dataset name/source]. See `training/` (if included) for the
training script, data splits, and evaluation metrics.

## Team

Built as part of the Cooperative Gig Services Platform project (SIH26089).

## License

[Add license here, e.g. MIT]
