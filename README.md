# Coffee-Container ☕📦

**Coffee-Container** is a secret-code-based file-sharing web application. It provides a simple interface to upload a file and/or text with a secret code, store upload metadata in Firebase Firestore, and store uploaded files in Cloudinary. A recipient can use the secret code to download the uploaded file.

> **Project status:** This README documents the current code in this repository. Configure your own Firebase and Cloudinary projects before running it. Review the security notes before deploying it publicly.

## Features

- Upload a file (maximum **10 MB**) with a secret code.
- Optionally attach text to an upload.
- Reject a secret code that already exists in Firestore.
- Store upload metadata in Firebase Firestore.
- Store uploaded files in Cloudinary.
- Download a file using its secret code.
- Generate a `curl` command after a successful upload.
- React + Vite frontend with a Node.js/Express backend.

## Tech stack

- **Frontend:** React, Vite, Chakra UI, Lucide React, React Icons, React Hot Toast
- **Backend:** Node.js, Express
- **Metadata storage:** Firebase Firestore
- **File storage:** Cloudinary
- **Other libraries:** Multer, Axios, CORS, dotenv, Archiver

## Project structure

```text
Coffee-Container/
├── backend/
│   ├── app.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── firebase/
│   │       └── config.js
│   ├── package.json
│   ├── vite.config.js
│   └── ...
├── package.json
├── package-lock.json
└── README.md
```

## Prerequisites

Install the following before starting:

- [Node.js](https://nodejs.org/) **16 or newer** (Node.js LTS is recommended)
- npm (included with Node.js)
- A [Firebase](https://firebase.google.com/) project with **Cloud Firestore** enabled
- A [Cloudinary](https://cloudinary.com/) account

## 1. Clone the repository

Replace the URL below with the URL of your GitHub repository:

```bash
git clone https://github.com/<your-username>/Coffee-Container.git
cd Coffee-Container
```

## 2. Configure Firebase and Cloudinary

### Firebase

1. Create a Firebase project.
2. Enable **Cloud Firestore**.
3. Register or configure the web app and copy its Firebase configuration.
4. Add the configuration values to the backend environment file described below.

The backend reads these environment variable names:

```env
apikey=your_firebase_api_key
authdomain=your-project.firebaseapp.com
projectid=your-firebase_project_id
storagebucket=your-project.firebasestorage.app
messagingsenderid=your_messaging_sender_id
appid=your_firebase_app_id
databaseurl=https://your-project-default-rtdb.firebaseio.com/
```

The backend uses Firestore; the `databaseurl` value is part of the current Firebase configuration object but is not required for the Firestore calls shown in `backend/app.js`.

### Cloudinary

1. Sign in to Cloudinary.
2. Open your dashboard.
3. Copy your cloud name, API key, and API secret.

Create a file named **`backend/.env`**:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

apikey=your_firebase_api_key
authdomain=your-project.firebaseapp.com
projectid=your-firebase_project_id
storagebucket=your-project.firebasestorage.app
messagingsenderid=your_messaging_sender_id
appid=your_firebase_app_id
databaseurl=https://your-project-default-rtdb.firebaseio.com/
```

Use your own values; do not commit `.env` files or secrets to GitHub. If your Firebase configuration is already hardcoded in `frontend/src/firebase/config.js`, move it to Vite environment variables before deploying and keep privileged credentials only on the server. Firebase web API keys are not equivalent to server secrets, but Firestore access must still be protected by appropriate Firebase Security Rules.

## 3. Install dependencies

From the project root, run:

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
```

Or use the root helper script:

```bash
npm run install-all
```

## 4. Build the frontend

From the project root:

```bash
npm run build --prefix frontend
```

This creates `frontend/dist`, which the Express backend serves as static files.

## 5. Start the application

Make sure `backend/.env` is configured, then from the project root run:

```bash
npm start
```

The backend starts on:

```text
http://localhost:3000
```

Open that address in your browser. The backend serves the built frontend and the API from the same origin.

### Development workflow

To work on the React frontend with Vite hot reload, open two terminals.

**Terminal 1 — frontend:**

```bash
cd frontend
npm install
npm run dev
```

**Terminal 2 — backend:**

```bash
cd backend
npm install
node app.js
```

The current frontend uses relative API paths (`/api`). If you use the Vite development server, configure a Vite proxy for `/api` to `http://localhost:3000`, or use the production-style workflow above (build the frontend and open `http://localhost:3000`). The current `vite.config.js` may need a `server.proxy` entry for this development setup.

## How to use the application

### Upload content

1. Open the application in your browser.
2. In **Upload Content**, enter a unique secret code.
3. Optionally enter text.
4. Optionally choose a file (maximum 10 MB).
5. Click **Upload**.
6. After a successful upload, save the secret code and use the generated `curl` command to download the file.

A secret code is an identifier, not a password or an authentication mechanism. Avoid using sensitive or easy-to-guess codes.

### Download a file

The current backend provides a download endpoint using the secret code:

```text
GET http://localhost:3000/api/download/<SECRET_CODE>
```

You can use the generated command from the application, or run a command like this (replace the secret code):

```bash
curl -L "http://localhost:3000/api/download/<SECRET_CODE>" -o "downloaded-file"
```

The endpoint streams the file associated with that secret code. If no file is associated with the code, the server returns an error. The current frontend's download form should be checked against this endpoint: the endpoint streams a file, while the current form attempts to parse its response as JSON.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/upload` | Upload optional text and a file with a secret code (`multipart/form-data`; file field name: `file`) |
| `GET` | `/api/file/:secretCode` | Stream the uploaded file with its original filename |
| `GET` | `/api/download/:secretCode` | Stream the uploaded file as a download |

### Upload request fields

- `secretCode` (**required**): unique code for the upload.
- `text` (optional): text stored alongside the file.
- `file` (optional): file to upload; maximum 10 MB.

## Troubleshooting

- **Firebase/Firestore errors:** Confirm the project ID and Firebase configuration in `backend/.env`, verify that Firestore is enabled, and check your Firestore Security Rules.
- **Cloudinary upload errors:** Verify the cloud name, API key, and API secret in `backend/.env`.
- **Secret code already in use:** Choose a different code; the current backend does not allow duplicate codes.
- **Frontend does not load:** Run `npm run build --prefix frontend`, then restart the backend.
- **Frontend development server cannot reach the API:** Add a Vite proxy for `/api` or use the built frontend through `http://localhost:3000`.
- **Download form returns an error:** The current UI expects JSON from `/api/download/:secretCode`, but the backend sends a file stream. Use the generated `curl` command, or update the frontend to handle a binary download response.

## Security notes before deployment

- Do not commit `.env` files, API secrets, service-account keys, or other credentials.
- Add `backend/.env` to the root `.gitignore`.
- Replace permissive CORS settings with the exact production frontend origin.
- Configure and test Firebase Security Rules; do not assume a secret code alone makes data secure.
- Add rate limiting and stronger secret-code validation to reduce guessing and abuse.
- Avoid returning stack traces or internal error details to clients in production.
- Review upload validation and Cloudinary access settings before accepting untrusted files.
- The current app has a 10 MB upload limit and uses in-memory file storage; account for memory usage when deploying.
- Test the download flow end-to-end before publishing the application.

## Contributing

Contributions and improvements are welcome. For significant changes, open an issue first to discuss what you would like to change.

## License

This project includes a `LICENSE` file. Review it for the applicable license terms.
