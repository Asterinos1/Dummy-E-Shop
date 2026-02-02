# Cloud-Native E-Shop Application

A microservices-based e-commerce platform designed to demonstrate cloud-native principles, event-driven architecture, and centralized identity management.

## Description

This project is a fully containerized E-Shop application developed for the "Cloud/Fog Services" university course. It moves beyond traditional monolithic design by splitting functionality into distinct microservices: **Product Service**, **Order Service**, and **Frontend Service**.

The system leverages **Apache Kafka** for asynchronous communication, ensuring that order placement and stock reservation happen in a decoupled, reliable manner. **Keycloak** is integrated to handle all Authentication and Authorization, enforcing strict role-based access control (RBAC) for "Sellers" and "Customers." Data persistence is managed via dedicated **PostgreSQL** databases for each service to ensure loose coupling.

Key Features:
* [cite_start]**Microservices Architecture:** Independent services for Products and Orders.
* [cite_start]**Event-Driven Logic:** Uses Kafka to handle stock validation asynchronously (Order Pending -> Stock Check -> Success/Reject).
* [cite_start]**Centralized Security:** Keycloak handles login/registration and protects API endpoints via Bearer Tokens.
* [cite_start]**Containerization:** Fully orchestrated using Docker and Docker Compose.

## Getting Started

### Dependencies

Before running the application, ensure you have the following installed on your operating system:

* **Docker Desktop** (v4.0+ recommended) - Essential for running containers.
* **Git** - To clone the repository.
* **Operating System:** Windows 10/11 (with WSL2), macOS, or Linux.
* **Ports:** Ensure the following ports are free on your host machine:
    * `3000` (Frontend)
    * `5000` (Product Service)
    * `5001` (Order Service)
    * `8080` (Keycloak)
    * `9092` (Kafka)

### Installing

1.  **Clone the Repository**
    ```bash
    git clone [https://github.com/yourusername/e-shop-cloud-native.git](https://github.com/yourusername/e-shop-cloud-native.git)
    cd e-shop-cloud-native
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
    * Wait approximately 30-60 seconds for Keycloak and Kafka to fully initialize.
    * You can monitor the status using: `docker-compose logs -f keycloak kafka`

3.  **Access the Application**
    * **Frontend (E-Shop):** Open [http://localhost:3000](http://localhost:3000)
    * **Keycloak Admin Console:** Open [http://localhost:8080](http://localhost:8080)
        * User: `admin`
        * Password: `adminpassword`

4.  **Test Users**
    * **Seller:** Login with `seller1` / `seller1` (Can manage products).
    * **Customer:** Login with `customer1` / `customer1` (Can place orders).

## Help

**Common Issues:**

* **Keycloak Connection Refused:**
    Keycloak takes time to start. If the frontend redirects to an error page immediately, wait 30 seconds and refresh.
    
* **Kafka "Broker Not Available":**
    If the services crash on startup, it is likely because Kafka wasn't ready. The `restart: always` or `healthcheck` in Docker Compose handles this, but you can manually restart a service:
    ```bash
    docker-compose restart product-service order-service
    ```

* **CORS Errors:**
    If you see CORS errors in the browser console, ensure you are accessing the site via `localhost:3000` and not an IP address, as the Keycloak configuration expects `localhost`.

* **Database Errors:**
    If tables are missing, the initialization scripts might have failed. Check the logs:
    ```bash
    docker-compose logs db-products db-orders
    ```

## Version History

* **2(Current)**
    * Added Apache Kafka for asynchronous order processing (Stock Check flow).
    * Integrated Keycloak for full RBAC (Seller vs Customer roles).
    * Refactored architecture into `services/` and `infrastructure/` directories.
    * Fixed Docker networking and DNS resolution issues.
* **1**
    * Initial release with basic Product and Order REST APIs.
    * Simple Frontend implementation.
    * Basic Docker Compose setup (No Messaging, No Auth).

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.

## Acknowledgments

* [Course Materials - Cloud/Fog Services (TUC)](https://www.tuc.gr)
* [Keycloak Docker Documentation](https://www.keycloak.org/server/containers)
* [KafkaJS Documentation](https://kafka.js.org/)
* [awesome-readme](https://github.com/matiassingers/awesome-readme)