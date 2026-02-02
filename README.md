# Cloud-Native E-Shop Application

A microservices-based e-commerce platform designed to demonstrate cloud-native principles, event-driven architecture, and centralized identity management.

## Description

This project is a fully containerized E-Shop application developed for the "Cloud/Fog Services" university course. It moves beyond traditional monolithic design by splitting functionality into distinct microservices: **Product Service**, **Order Service**, and **Frontend Service**.

The system leverages **Apache Kafka** for asynchronous communication, ensuring that order placement and stock reservation happen in a decoupled, reliable manner. **Keycloak** is integrated to handle all Authentication and Authorization, enforcing strict role-based access control (RBAC) for "Sellers" and "Customers." Data persistence is managed via dedicated **PostgreSQL** databases for each service to ensure loose coupling.


## Getting Started

### Dependencies

Before running the application, ensure you have the following installed on your operating system:

* **Docker Desktop** (v4.0+ recommended) - For running containers.
* **Ports:** Ensure the following ports are free on your host machine:
    * `3000` (Frontend)
    * `5000` (Product Service)
    * `5001` (Order Service)
    * `8080` (Keycloak)
    * `9092` (Kafka)

### Installing

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/Asterinos1/Dummy-E-Shop
    cd Dummy-E-Shop
    ```

2.  **Environment Setup**
    Create a `.env` file in the root directory (if not already present) with the following default credentials:
    ```ini
    DB_USER=admin
    DB_PASSWORD=adminpassword
    NODE_ENV=development
    ```

3.  **Project Structure Verification**
    Ensure your directories are organized as follows:
    * `services/` (Source code for Product, Order, and Frontend services)
    * `infrastructure/` (SQL scripts and Keycloak realm config)
    * `docker-compose.yml` (Root orchestration file)

### Executing program

1.  **Build and Start the System**
    Run the following command in the root directory to build the images and start all services:
    ```bash
    docker-compose up --build
    ```

2.  **Wait for Initialization**
    * Wait for Keycloak and Kafka to fully initialize.
    * You can monitor the status using: `docker-compose logs -f keycloak kafka`

3.  **Access the Application**
    * **Frontend (E-Shop):** Open [http://localhost:3000](http://localhost:3000)
    * **Keycloak Admin Console:** Open [http://localhost:8080](http://localhost:8080)
        * User: `admin`
        * Password: `adminpassword`

4.  **Test Users**
    * **Seller:** Login with `seller1` / `seller1` (Can manage products).
    * **Customer:** Login with `customer1` / `customer1` (Can place orders).

## Version History
* **OLD**
    * Initial release with basic Product and Order REST APIs.
    * Simple Frontend implementation.
    * Basic Docker Compose setup (No Messaging, No Auth).
* **NEW(Current)**
    * Added Apache Kafka for asynchronous order processing.
    * Refactored architecture into `services/` and `infrastructure/` directories.
    * Fixed Docker networking and DNS resolution issues.

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.