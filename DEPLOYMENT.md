# Patient app deployment

The patient app has two runtime services:

1. `PrescriptionSafetyEngine/backend` — FastAPI, patient accounts, medicine data, and the canonical safety engine.
2. `med-conscious-patient` — React/Express UI, Gemini chatbot, and a small proxy to the FastAPI service.

## 1. Deploy the FastAPI backend

From `PrescriptionSafetyEngine`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Configure the backend environment before starting it:

```env
TIGER_DATABASE_URL=postgresql://...
MEDICINE_DATABASE_URL=sqlite:////absolute/path/to/umi_rx.db
JWT_SECRET_KEY=<long-random-production-secret>
FRONTEND_URL=https://patient.example.com
```

`PatientAccount` is created automatically by the existing SQLAlchemy startup initialization. Keep `umi_rx.db` (or the configured medicine database) available to the backend; it is required for medicine-name resolution and safety checks.

Verify:

```bash
curl https://api.example.com/
```

## 2. Deploy the patient app

From `med-conscious-patient`:

```bash
npm ci
npm run build
npm start
```

Set these server-side environment variables:

```env
PORT=3000
GEMINI_API_KEY=<gemini-key>
SAFETY_API_BASE_URL=https://umirxbackend.vercel.app
```

`SAFETY_API_BASE_URL` must point to the FastAPI base URL, without a trailing slash. Do not expose it as a `VITE_` variable and do not put backend secrets in browser code.

## 3. Reverse proxy and HTTPS

Expose the Express service publicly, terminate TLS at the hosting provider or reverse proxy, and route the public patient domain to port `3000`. Route the API domain to FastAPI port `8000`.

For local development, run both services:

```bash
# terminal 1
cd PrescriptionSafetyEngine/backend
uvicorn app.main:app --reload --port 8000

# terminal 2
cd med-conscious-patient
SAFETY_API_BASE_URL=http://localhost:8000 npm run dev
```

## 4. Smoke test

1. Register a patient with age, allergies, conditions, and active medicines.
2. Upload or paste a prescription in the chatbot.
3. Confirm the detected medicines are sent to `/patient/safety-check`.
4. Confirm the response contains DDI, allergy, duplicate-therapy, dosage, age, and disease-condition alerts where applicable.
5. Confirm an unauthenticated request receives `401` and that the patient token is never logged or exposed to Gemini.

The patient result is safety guidance, not a diagnosis or prescription. The UI should direct patients to a qualified clinician for treatment decisions.
