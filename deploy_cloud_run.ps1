# ABES Gate Security - Google Cloud Run Deployment Script
# Run this script in PowerShell to build and deploy your backend to Cloud Run.

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   ABES GATE SECURITY - CLOUD RUN DEPLOY" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Check if gcloud is installed
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Google Cloud CLI (gcloud) is not installed." -ForegroundColor Red
    Write-Host "Please download and install it from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit
}

# 2. Authenticate
Write-Host "`nStep 1: Authenticating with Google Cloud..." -ForegroundColor Cyan
gcloud auth login

# 3. Get Project ID
Write-Host "`nStep 2: Please enter your Google Cloud Project ID:" -ForegroundColor Cyan
$ProjectId = Read-Host "Project ID"
if ([string]::IsNullOrEmpty($ProjectId)) {
    Write-Host "[ERROR] Project ID cannot be empty." -ForegroundColor Red
    exit
}

# Set project context
gcloud config set project $ProjectId

# 4. Enable Google Services
Write-Host "`nStep 3: Enabling Cloud Build and Cloud Run API Services..." -ForegroundColor Cyan
gcloud services enable run.googleapis.com builds.googleapis.com

# 5. Build and Upload Container using Cloud Build
Write-Host "`nStep 4: Compiling and uploading container image to Google Container Registry..." -ForegroundColor Cyan
gcloud builds submit --tag gcr.io/$ProjectId/abes-security-backend --timeout=15m

# 6. Deploy to Google Cloud Run
Write-Host "`nStep 5: Deploying backend service to Google Cloud Run..." -ForegroundColor Cyan
gcloud run deploy abes-security-backend `
    --image gcr.io/$ProjectId/abes-security-backend `
    --platform managed `
    --region us-central1 `
    --allow-unauthenticated `
    --port 5000 `
    --set-env-vars="FACE_PROVIDER=MOCK,PORT=5000"

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host "   DEPLOYMENT INITIATED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Check your Cloud Run dashboard on Google Cloud Console for service status." -ForegroundColor Yellow
