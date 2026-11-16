# Dev404

### API Development, Testing & Mocking Platform

Dev404 is an all-in-one developer platform that simplifies API configuration, testing, and mock API generation in a single workspace.

It combines API Vault, TestSpace, and Mock API to make API development and testing easier and more efficient.

## Features

### API Vault

- Manage API configurations and Base URLs.
- Store authentication credentials securely.
- Organize APIs in a centralized vault.
- Connect saved APIs with TestSpace.

### TestSpace

- Test APIs using GET, POST, PUT, PATCH, and DELETE.
- Configure headers, query parameters, authorization, and JSON body.
- View response status, execution time, headers, and body.
- Save requests in collections.
- Access request history.

### Mock API

- Import OpenAPI/Swagger JSON and YAML files.
- Create endpoints manually without an OpenAPI file.
- Configure multiple endpoints, methods, and response schemas.
- Generate realistic, schema-aware fake data.
- Customize the number of response records.
- Test generated endpoints directly or through TestSpace.

## Tech Stack

|  Category  | Technology |
|     ---    |       ---     |
|  Frontend  |        React.js, Vite, Tailwind CSS |
|  Backend   |        Python, FastAPI |
|  Database  |        PostgreSQL |
|    ORM     |        SQLAlchemy |
| Migrations |        Alembic |
| Authentication |    JWT, Passlib, Bcrypt |

## Project Highlights

- Centralized API configuration and credential management.
- Backend-powered HTTP request execution and response inspection.
- OpenAPI specification parsing and schema-based mock generation.
- Manual endpoint creation with customizable response structures.
- Dynamic mock endpoints with configurable record counts.
