# WAR! Online Campaign System

An invite-only, backend-authoritative online campaign management platform for the WAR! tabletop wargaming system. This system supports hybrid tabletop and asynchronous online modes where GMs can manage campaigns, invite players, run timed phases, collect hidden orders, and resolve outcomes.

## Documentation

- **[WAR! Online Campaign Alpha — Technical Blueprint](blueprint.md)** — The canonical architecture document. All implementation must align with this blueprint unless explicitly revised.
- **[Alpha Setup Guide](docs/alpha-setup-guide.md)** — Practical walkthrough for local setup plus current GM and player flows in the alpha UI.

## Architecture Overview

This is a **backend-authoritative** system built on modern technologies:

- **Backend**: Spring Boot 3.3.5 with Spring Security and Spring Data JPA
- **Frontend**: React 19 with Vite and Zustand state management  
- **Database**: PostgreSQL with Flyway migrations
- **Testing**: Comprehensive integration tests for campaign features

Key architectural principles:
- All campaign state is authoritative on the backend
- Role-based and faction-safe visibility (fog of war enforced server-side)
- User authentication and invite-only access control
- Audit-friendly history and event logging
- Separate write and read models for campaign state

## Getting Started

### Prerequisites

- Java 21
- Node.js (latest LTS)
- Maven
- PostgreSQL (for backend database)

### Installation (Ubuntu/Debian Linux)

1. **Update package list**:
   ```bash
   sudo apt update
   ```

2. **Install Java 21**:
   ```bash
   sudo apt install openjdk-21-jdk
   ```
   Verify: `java -version`

3. **Install Maven**:
   ```bash
   sudo apt install maven
   ```
   Verify: `mvn -version`

4. **Install Node.js and npm**:
   ```bash
   sudo apt install nodejs npm
   ```
   Verify: `node -v && npm -v`

5. **Install PostgreSQL**:
   ```bash
   sudo apt install postgresql postgresql-contrib
   ```
   Start service: `sudo systemctl start postgresql`
   Enable on boot: `sudo systemctl enable postgresql`

6. **Setup PostgreSQL database**:
   ```bash
   sudo -u postgres psql
   CREATE DATABASE war_campaign;
   CREATE USER war WITH PASSWORD 'war';
   GRANT ALL PRIVILEGES ON DATABASE war_campaign TO war;
   \q
   ```

### Running the Application

#### Development Mode

1. **Start the Backend (war-api)**:
   ```bash
   cd apps/war-api
   mvn spring-boot:run
   ```
   The API will start on `http://localhost:8080`
   
   The backend includes:
   - User authentication endpoints
   - Campaign management (create, join, manage campaigns)
   - Invite acceptance system
   - Campaign phase management
   - Order submission and resolution
   - Real-time audit logging

2. **Start the Frontend (war-ui)**:
   ```bash
   cd apps/war-ui
   npm install
   npm run dev
   ```
   The UI will start on `http://localhost:5173` (Vite dev server).

3. **Access the Application**:
   - Open `http://localhost:5173` in your browser
   - The backend must be running for full functionality
   - Authentication is required to access campaigns
   - In local development, the frontend uses the backend dev-auth flow by storing the chosen email locally and sending it as the `X-Dev-User` header

#### Current Alpha Frontend Routes

- `/login` — dev-mode sign in
- `/invite/:token` — invite lookup and acceptance
- `/app/campaigns` — joined campaigns list
- `/app/campaigns/:campaignId/lobby` — roster and assignment view
- `/app/campaigns/:campaignId/dashboard` — current phase, turn, timer, next-action view
- `/app/campaigns/:campaignId/map` — strategic map page with territory selection and role-safe detail panel

See [docs/alpha-setup-guide.md](docs/alpha-setup-guide.md) for a practical walkthrough as GM or player.

#### Notes on Development

- **Database**: PostgreSQL with automated migrations via Flyway
- **Authentication**: Spring Security with custom authentication logic
- **Testing**: Run `mvn test` in `apps/war-api/` to execute integration tests
- **Build Status**: Check `apps/war-api/target/surefire-reports/` for test results

### Building for Production

**Frontend**:
```bash
cd apps/war-ui
npm run build
```
Output is built to `dist/` and deployed to GitHub Pages (docs folder).

**Backend**:
```bash
cd apps/war-api
mvn clean package
```
Creates a JAR file in `target/` ready for deployment.

## Project Structure

```
apps/
├── war-api/              # Spring Boot backend (Java 21)
│   ├── src/main/java/   # Campaign domain, entities, APIs
│   ├── src/test/java/   # Integration tests
│   └── pom.xml          # Maven configuration
└── war-ui/              # React + Vite frontend (TypeScript)
    ├── src/             # React components and state management
    ├── public/          # Static assets (theater data, etc.)
    └── package.json     # npm dependencies

blueprint.md             # Canonical architecture specification
README.md               # This file
```

## Key Features (In Development)

- ✅ User authentication and authorization
- ✅ Campaign lobbies with GM and player roles
- ✅ Invite-based access control
- ✅ Campaign phase management
- ✅ Campaign dashboard with current phase and timer strip
- ✅ Campaign map with role-safe territory detail reads
- ✅ Order submission system
- ✅ Resolution and outcome calculation
- ✅ Fog of war (server-enforced visibility)
- ✅ Audit logging and campaign history
- 🚧 Real-time notifications
- 🚧 Battle integration
- 🚧 Supply and resource management

## Contributing

This project follows the architecture outlined in [blueprint.md](blueprint.md). All pull requests should maintain alignment with the specified domain model and architectural patterns.

### Testing

Run integration tests:
```bash
cd apps/war-api
mvn verify
```

Run frontend linting:
```bash
cd apps/war-ui
npm run lint
```

## Support

For questions about the system architecture, refer to [blueprint.md](blueprint.md). For implementation details, review the test files in `apps/war-api/src/test/java/`.
