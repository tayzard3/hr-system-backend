# Node.js Application Deployment Guide

This guide provides step-by-step instructions for deploying and running this Node.js application in a production environment without using Docker. It covers prerequisites, environment configuration, and database setup.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Variables (.env)](#2-environment-variables-env)
   - [General Application Settings](#general-application-settings)
   - [Database Configuration](#database-configuration-mysql)
   - [Authentication (JWT)](#authentication-jwt)
   - [Pagination](#pagination)
   - [Caching (Redis)](#caching-redis-optional)
   - [Email Service (SendGrid)](#email-service-sendgrid)
   - [Server-Sent Events (SSE)](#server-sent-events-sse)
   - [Exchange & Transactions](#exchange-&-transactions)
   - [File Storage (Azure Blob)](#file-storage-azure-blob)
3. [Application Installation](#3-application-installation)
4. [Database Setup (MySQL)](#4-database-setup-mysql)
5. [Running the Application](#5-running-the-application)
   - [Development Mode](#development-mode)
   - [Production Mode](#production-mode)

---

## 1. Prerequisites

Before you begin, ensure the following software is installed on your deployment server:

- **Node.js:** Version 20.x or later (recommended LTS version).
   - You can use a tool like `nvm` (Node Version Manager) for easy installation and management:
- **npm** or **Yarn:** Node.js package manager (npm comes with Node.js).
- **MySQL:** The database server.
   - Installation varies by OS (e.g., `sudo apt install mysql-server` on Ubuntu).
- **Redis:** For caching and session management.
   - Installation varies by OS (e.g., `sudo apt install redis-server` on Ubuntu).

---

## 2. Environment Variables (.env)

This application uses environment variables for configuration. You need to create a `.env` file in the root directory of the project on your server.

**Example `.env` file structure:**

### Explanation of Variables:

#### General Application Settings

- `NODE_ENV`:
   - `development`: For development environment (e.g., more verbose logging, hot-reloading).
   - `production`: For production environment (e.g., optimized code, less verbose logging). **Set this to `production` for deployment.**
- `DB_LOGGING`:
   - `true` / `false`: Controls whether database queries are logged to the console. Set to `false` in production for performance.
- `SERVER_PORT`:
   - `3000`: The port on which the Node.js application will listen for incoming requests.

#### Database Configuration (MySQL)

- `DEV_DB_CONNECTION`:
   - `mysql`: Specifies the database dialect/connection type.
- `DEV_DB_HOST`:
   - `127.0.0.1`: The hostname or IP address of your MySQL database server. Use `localhost` or the specific IP if the database is on a different server.
- `DEV_DB_DATABASE`:
   - `your_database_name`: The name of the MySQL database for this application.
- `DEV_DB_USERNAME`:
   - `your_db_user`: The username for connecting to the MySQL database.
- `DEV_DB_PASSWORD`:
   - `your_db_password`: The password for the MySQL database user.

#### Timezone

- `TIME_ZONE`:
   - `Asia/Yangon`: The timezone for the application. Ensure this matches a valid IANA timezone string.

#### Authentication (JWT)

- `JWT_SECRET`:
   - `a_very_strong_and_long_secret_key_for_jwt_signing`: A strong, random string used to sign and verify JSON Web Tokens (JWTs). **Generate a complex, unique string for production and keep it secure.**

#### Pagination

- `DEFAULT_PAGINATE`:
   - `25`: The default number of items to return per page for paginated API responses.

#### Caching (Redis) (Optional)

- `REDIS_PORT`:
   - `6379`: The port on which your Redis server is listening.
- `REDIS_HOST`:
   - `127.0.0.1`: The hostname or IP address of your Redis server.
- `REDIS_PASSWORD`:
   - `your_redis_password_if_any`: The password for your Redis server, if authentication is enabled. Leave empty if no password.
- `REDIS_MAX_RETRY`:
   - `10`: The maximum number of times Redis connection attempts will retry.

#### Email Service (SendGrid)

- `SENDGRID_ACCOUNT_NAME`:
   - `Your App Name`: The sender name that will appear in emails sent via SendGrid.
- `SENDGRID_ACCOUNT_EMAIL`:
   - `no-reply@yourapp.com`: The sender email address that will appear in emails. This email must be verified in your SendGrid account.
- `SENDGRID_API_KEY`:
   - `SG.your_sendgrid_api_key`: Your SendGrid API Key. **Keep this highly secure.**
- `SENDGRID_RETRY`:
   - `3`: The number of times to retry sending an email if it fails.

---

## 3. Application Installation

1. **Clone the Repository:**
   On your deployment server, clone the application's Git repository:

   ```bash
   git clone <your-repository-url>
   cd <your-project-directory>
   ```

2. **Install Dependencies:**
   Install all required Node.js packages:
   ```bash
   npm install
   ```
3. **Create Environment File:**
   Copy the example environment file and rename it to `.env`.
   ```bash
   cp .env.example .env
   # Then, edit this file to configure your specific environment variables with your preferred editor.
   ```
4. **Build the Application:**
   If your project uses TypeScript or a build step (e.g., Webpack, Rollup), compile the application for production:
   ```bash
   npm run build
   ```
   This command typically compiles your TypeScript code into JavaScript in the `dist` directory (as configured in `tsconfig.json`).

---

## 4. Database Setup (MySQL)

1. **Create a MySQL User and Database:**
   Connect to your MySQL server (e.g., using `mysql -u root -p`):

   ```
   *Replace `your_db_user`, `your_db_password`, and `your_database_name` with the values you'll use in your `.env` file.*
   ```

2. **Run Database Migrations:**
   Navigate to your project's root directory and run the database migrations to set up the schema:

   ```bash
   npx sequelize db:migrate
   ```

3. **Run Database Seeders (Optional):**
   If your application requires initial data, run the seeders:
   ```bash
   npx sequelize db:seed:all
   ```

---

## 5. Running the Application

### Development Mode

For local testing or development, you can run the application directly:

```bash
npm run start
```

### Production Mode

**Start the Application**
Navigate to your project's root directory and start the application. The compiled entry file is `dist/server.js` (source is `server.ts`, compiled to `outDir` in `tsconfig.json`):

```bash
node dist/server.js
```
