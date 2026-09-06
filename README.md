# Reflections: Private AI Journal with Gemini & Cloud Firestore

A production-ready, full-stack reflective journaling web application featuring passwordless Firebase Authentication (Google Sign-In), owner-isolated Cloud Firestore storage, and server-side multi-turn conversation powered by Gemini 3.6 Flash.

---

## Architecture Overview

- **Frontend**: React 19, Tailwind CSS v4, Lucide Icons, Motion.
- **Backend & Proxy**: Node.js & Express server hosting Gemini API endpoints with top-level request deserialization and fallback resilience.
- **Identity**: Firebase Authentication with Federated Google Sign-In.
- **Database**: Cloud Firestore with strict Attribute-Based Access Control (ABAC) and owner-bound isolation rules.
- **AI Processing Engine**: Gemini 3.6 Flash with automated fallback ladder (`gemini-3.6-flash` -> `gemini-3.1-flash-lite` -> `gemini-flash-latest` -> `gemini-3.7-flash`).

---

## 1. Environment & Prerequisites

Ensure you have the Google Cloud SDK (`gcloud`) installed and authenticated:

```bash
# Authenticate gcloud CLI
gcloud auth login

# Set your active Google Cloud project
gcloud config set project YOUR_PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com
```

---

## 2. Secret Management Setup

To maintain zero-hardcoding hygiene, store your Gemini API key in Google Cloud Secret Manager and grant Cloud Run access:

```bash
# Create the secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Add your Gemini API Key version
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Compute Engine service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration

Cloud Firestore enforces strict owner-bound data isolation under `/users/{userId}/interactions/{interactionId}`.

### Firestore Security Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Zero-Trust Default Deny
    match /{document=**} {
      allow read, write: if false;
    }

    // Isolated User Profile & Settings
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Isolated User Interactions & Reflections
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy the security rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Cloud Run Deployment Flow

Build and deploy the application container to Google Cloud Run:

```bash
# Build and deploy the service
gcloud run deploy reflections-journal \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --port 3000
```

---

## 5. Required Campaign Verification Binding

Apply the mandatory challenge verification label to register the service:

```bash
gcloud run services update reflections-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region asia-southeast1
```

---

## 6. Functional Verification & Test Walkthrough

To verify all system capabilities end-to-end:

1. **Unauthenticated Landing & Sign In**:
   - Access the root URL. Confirm the landing screen displays Zero-Trust Firestore Security badge.
   - Click `Continue with Google`. Complete sign-in popup.
2. **Dashboard Isolation Verification**:
   - Verify header shows `uid:{user.uid}` and the Cloud Firestore indicator.
3. **Multi-Turn Reflection**:
   - Select mode `Reflect`. Write an initial reflection and click `Reflect`.
   - Verify Gemini 3.6 Flash responds with empathetic analysis and clarifying prompts.
   - Send a follow-up response; verify multi-turn conversational context is maintained.
4. **Adaptive Modes**:
   - Switch mode to `Summarize` to produce bullet-point takeaways.
   - Switch mode to `Brainstorm` to generate alternative perspectives and solutions.
5. **Real-Time Persistence & History**:
   - Refresh page or switch entries; verify past entries remain preserved in the history sidebar.
   - Use the search bar to filter by title or keyword.
   - Click the delete icon on an entry; confirm the deletion modal removes the document from Firestore.
