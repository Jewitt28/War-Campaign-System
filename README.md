# War-Campaign-System

## Documentation

- [WAR! Online Campaign Alpha — Technical Blueprint](docs/WAR-online-campaign-alpha-technical-blueprint.md)

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

1. **Start the Backend (war-api)**:
   ```bash
   cd apps/war-api
   mvn spring-boot:run
   ```
   The API will start on `http://localhost:8080` (or configured port).

2. **Start the Frontend (war-ui)**:
   ```bash
   cd apps/war-ui
   npm install
   npm run dev
   ```
   The UI will start on `http://localhost:5173` (Vite dev server).

3. **Access the Application**:
   - Open `http://localhost:5173` in your browser to access the WAR Campaign System UI.
   - Ensure the backend is running for full functionality.

### Building for Production

- **Frontend**: `npm run build` in `apps/war-ui/`
- **Backend**: `mvn clean package` in `apps/war-api/`
