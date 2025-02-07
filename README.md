# Digital Wallet System

A secure and scalable mini digital wallet system with user authentication, wallet management, and fund transactions.

## Features
- User authentication (Register/Login)
- Wallet balance check & transaction history
- Fund deposit, withdrawal, and transfers
- Multi-currency support with exchange rate conversion
- Transaction limits and fraud detection
- API rate limiting for security

## Installation
```sh
git clone https://github.com/45Saurabh45/digital_wallet_system.git
cd digital-wallet-system
npm install
npm start

## Authentication Endpoints

| Method | Endpoint       | Middlewares     | Description               |
|--------|----------------|-----------------|---------------------------|
| POST   | /register      | apiLimiter      | Register new user         |
| POST   | /login         | apiLimiter      | User authentication       |

## Wallet Endpoints

| Method | Endpoint           | Middlewares              | Description               |
|--------|--------------------|--------------------------|---------------------------|
| GET    | /balance           | authenticateUser          | Get current balance       |
| GET    | /transactionHistory| authenticateUser          | Get transaction records   |
| POST   | /add               | authenticateUser, apiLimiter | Deposit funds             |
| POST   | /withDraw          | authenticateUser, apiLimiter | Withdraw funds            |
| POST   | /transfer          | authenticateUser, apiLimiter | Transfer to another user  |

## Account Management

| Method | Endpoint                | Middlewares     | Description                   |
|--------|-------------------------|-----------------|-------------------------------|
| GET    | /getUser                | authenticateUser | Get user profile              |
| POST   | /setDefaultCurrency     | authenticateUser | Set preferred currency        |
| POST   | /setTransactionLimit    | authenticateUser | Configure transaction limits  |
| POST   | /detectFraud            | authenticateUser | Manual fraud check trigger    |

## Middlewares

### Security Middlewares

- **apiLimiter**  
  Implements rate limiting using Redis.  
  - Configuration: 100 requests/15 minutes per IP  
  - Prevents brute force attacks and DDoS.

- **authenticateUser**  
  JWT verification middleware.  
  - Checks Authorization header for Bearer token.  
  - Attaches user object to request context.