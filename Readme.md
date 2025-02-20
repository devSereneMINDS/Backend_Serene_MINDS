# Serene Minds Backend

This is the backend of Serene Minds, which features a Node.js-based Authentication API using the **pg** package to interact with **Supabase PostgreSQL**. The project includes user authentication (login) and demonstrates how to structure the codebase with **controllers** and **routes** in a minimal Express.js server.

## Features

- User login with email and passwords
- Direct interaction with Supabase PostgreSQL using the pg package
- Basic MVC structure (Controller + Routes)
- Appointment management (CRUD operations)
- Health tips, professional profiles, notes, journal entries, OTP validation, and payment processing
- Email notifications to clients and professionals

## Project Structure

```
.
├── config
│   └── database.js          # PostgreSQL client configuration
├── controllers
│   └── userController.js    # Authentication logic
│   └── appointmentController.js  # Appointment management
│   └── healthTipsController.js   # Health tips management
│   └── professionalController.js  # Professional profiles
│   └── notesController.js   # Notes management
│   └── journalController.js # Journal management
│   └── otpController.js     # OTP validation
│   └── paymentController.js # Payment processing
│   └── eventController.js   # Event management
│   └── chatController.js    # Chat functionality
│   └── sendController.js    # Send notifications
├── routes
│   └── userRoutes.js        # API routes for authentication
│   └── appointmentRoutes.js # API routes for appointment management
│   └── healthTipsRoutes.js  # Routes for health tips
│   └── professionalRoutes.js # Routes for professional profiles
│   └── notesRoutes.js       # Routes for notes management
│   └── journalRoutes.js     # Routes for journal entries
│   └── otpRoutes.js         # Routes for OTP validation
│   └── paymentRoutes.js     # Routes for payment processing
│   └── eventRoutes.js       # Routes for event management
│   └── chatRoutes.js        # Routes for chat functionality
│   └── sendRoutes.js        # Routes for send notifications
├── .env                     # Environment variables (not committed to version control)
├── index.js                 # Main entry point of the application
├── README.md                # This readme file
├── package.json             # Project dependencies
└── node_modules             # Installed dependencies
```

## Prerequisites

- **Node.js** (v14 or higher)
- **PostgreSQL** database hosted on Supabase

## Setup Instructions

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```

2. **Install dependencies:**

   Make sure you're in the project directory and run:

   ```bash
   npm install
   ```

3. **Create a `.env` file:**

   In the root of the project, create a `.env` file with the following variables (adjust as needed):

   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@[SUPABASE-HOST]:5432/postgres"
   PORT=3000
   ```

4. **Database Setup:**

   Ensure that your tables and schemas are created in Supabase. You can do this directly in the Supabase dashboard.

5. **Run the project:**

   Start the application using:

   ```bash
   npm start

## Appointment APIs

### 1. **Get All Appointments**
   **Endpoint:** `GET /appointment/all`

   **Description:** Fetches a list of all appointments.

   **Response Payload:**
   ```json
   [
     {
       "appointmentId": "123",
       "clientId": "456",
       "professionalId": "789",
       "date": "2024-12-28T09:00:00Z",
       "status": "confirmed",
       "notes": "Client requested additional consultation"
     },
     ...
   ]
   ```

---

### 2. **Create Appointment**
   **Endpoint:** `POST /appointment/create`

   **Description:** Creates a new appointment.

   **Request Payload:**
   ```json
   {
     "clientId": "456",
     "professionalId": "789",
     "date": "2024-12-28T09:00:00Z",
     "status": "pending",
     "notes": "Client has specific queries regarding mental health"
   }
   ```

   **Response Payload:**
   ```json
   {
     "appointmentId": "123",
     "message": "Appointment created successfully"
   }
   ```

---

### 3. **Get Appointment by ID**
   **Endpoint:** `GET /appointment/{appointmentId}`

   **Description:** Fetches details of a specific appointment.

   **Response Payload:**
   ```json
   {
     "appointmentId": "123",
     "clientId": "456",
     "professionalId": "789",
     "date": "2024-12-28T09:00:00Z",
     "status": "confirmed",
     "notes": "Client requested additional consultation"
   }
   ```

---

### 4. **Update Appointment**
   **Endpoint:** `PUT /appointment/update/{appointmentId}`

   **Description:** Updates the details of a specific appointment.

   **Request Payload:**
   ```json
   {
     "date": "2024-12-28T10:00:00Z",
     "status": "confirmed",
     "notes": "Updated time slot for client consultation"
   }
   ```

   **Response Payload:**
   ```json
   {
     "message": "Appointment updated successfully"
   }
   ```

---

### 5. **Delete Appointment**
   **Endpoint:** `DELETE /appointment/delete/{appointmentId}`

   **Description:** Deletes a specific appointment.

   **Response Payload:**
   ```json
   {
     "message": "Appointment deleted successfully"
   }
   ```

---

### 6. **Get Appointments by Client**
   **Endpoint:** `GET /appointment/client/{clientId}`

   **Description:** Fetches all appointments for a specific client.

   **Response Payload:**
   ```json
   [
     {
       "appointmentId": "123",
       "professionalId": "789",
       "date": "2024-12-28T09:00:00Z",
       "status": "confirmed",
       "notes": "Client requested additional consultation"
     },
     ...
   ]
   ```

---

### 7. **Get Appointments by Professional**
   **Endpoint:** `GET /appointment/professional/{professionalId}`

   **Description:** Fetches all appointments for a specific professional.

   **Response Payload:**
   ```json
   [
     {
       "appointmentId": "123",
       "clientId": "456",
       "date": "2024-12-28T09:00:00Z",
       "status": "confirmed",
       "notes": "Client requested additional consultation"
     },
     ...
   ]
   ```

---

### 8. **Get Professional Stats**
   **Endpoint:** `GET /appointment/professional/stats/{professionalId}`

   **Description:** Fetches statistics about a specific professional's appointments, such as total number of appointments, confirmed appointments, and cancellations.

   **Response Payload:**
   ```json
   {
     "totalAppointments": 45,
     "confirmedAppointments": 40,
     "cancelledAppointments": 5,
     "monthlyEarnings": 1200.50
   }
   ```

---

### 9. **Get Monthly Earnings**
   **Endpoint:** `GET /appointment/professional/monthly/{professionalId}`

   **Description:** Fetches the monthly earnings for a specific professional.

   **Response Payload:**
   ```json
   {
     "month": "December",
     "year": 2024,
     "earnings": 1200.50
   }
   ```


## Client APIs

### 1. **Get Clients List**
   **Endpoint:** `GET /clients2/all`

   **Description:** Fetches a list of all clients.

   **Response Payload:**
   ```json
   [
     {
       "id": 1,
       "name": "John Doe",
       "age": 30,
       "email": "john@example.com",
       "sex": "Male",
       "phone_no": "123-456-7890",
       "diagnosis": "Anxiety",
       "photo_url": "http://example.com/photo.jpg",
       "zipcode": "12345",
       "city": "New York",
       "appointment_id": 101,
       "assessment_id": 202,
       "invoice_id": 303,
       "medical_record_id": 404
     },
     ...
   ]
   ```

---

### 2. **Create Client**
   **Endpoint:** `POST /clients2/create`

   **Description:** Creates a new client.

   **Request Payload:**
   ```json
   {
     "name": "John Doe",
     "age": 30,
     "email": "john@example.com",
     "sex": "Male",
     "phone_no": "123-456-7890",
     "diagnosis": "Anxiety",
     "photo_url": "http://example.com/photo.jpg",
     "zipcode": "12345",
     "city": "New York",
     "appointment_id": 101,
     "assessment_id": 202,
     "invoice_id": 303,
     "medical_record_id": 404
   }
   ```

   **Response Payload:**
   ```json
   {
     "message": "Client created successfully",
     "data": {
       "id": 1,
       "name": "John Doe",
       "age": 30,
       "email": "john@example.com",
       "sex": "Male",
       "phone_no": "123-456-7890",
       "diagnosis": "Anxiety",
       "photo_url": "http://example.com/photo.jpg",
       "zipcode": "12345",
       "city": "New York",
       "appointment_id": 101,
       "assessment_id": 202,
       "invoice_id": 303,
       "medical_record_id": 404
     }
   }
   ```

---

### 3. **Get Client by ID or Name**
   **Endpoint:** `GET /clients2/{idOrName}`

   **Description:** Fetches details of a client by either ID or name.

   **Response Payload:**
   ```json
   {
     "id": 1,
     "name": "John Doe",
     "age": 30,
     "email": "john@example.com",
     "sex": "Male",
     "phone_no": "123-456-7890",
     "diagnosis": "Anxiety",
     "photo_url": "http://example.com/photo.jpg",
     "zipcode": "12345",
     "city": "New York",
     "appointment_id": 101,
     "assessment_id": 202,
     "invoice_id": 303,
     "medical_record_id": 404
   }
   ```

---

### 4. **Update Client**
   **Endpoint:** `PUT /clients2/update/{clientId}`

   **Description:** Updates the details of a specific client.

   **Request Payload:**
   ```json
   {
     "name": "John Doe",
     "age": 31,
     "email": "john.doe@example.com",
     "sex": "Male",
     "phone_no": "987-654-3210",
     "diagnosis": "Anxiety, Depression",
     "photo_url": "http://example.com/new-photo.jpg",
     "zipcode": "12345",
     "city": "Los Angeles",
     "appointment_id": 102,
     "assessment_id": 203,
     "invoice_id": 304,
     "medical_record_id": 405
   }
   ```

   **Response Payload:**
   ```json
   {
     "message": "Client updated successfully",
     "data": {
       "id": 1,
       "name": "John Doe",
       "age": 31,
       "email": "john.doe@example.com",
       "sex": "Male",
       "phone_no": "987-654-3210",
       "diagnosis": "Anxiety, Depression",
       "photo_url": "http://example.com/new-photo.jpg",
       "zipcode": "12345",
       "city": "Los Angeles",
       "appointment_id": 102,
       "assessment_id": 203,
       "invoice_id": 304,
       "medical_record_id": 405
     }
   }
   ```

---

### 5. **Delete Client**
   **Endpoint:** `DELETE /clients2/delete/{clientId}`

   **Description:** Deletes a specific client.

   **Response Payload:**
   ```json
   {
     "message": "Client deleted successfully",
     "data": {
       "id": 1,
       "name": "John Doe",
       "age": 31,
       "email": "john.doe@example.com",
       "sex": "Male",
       "phone_no": "987-654-3210",
       "diagnosis": "Anxiety, Depression",
       "photo_url": "http://example.com/new-photo.jpg",
       "zipcode": "12345",
       "city": "Los Angeles",
       "appointment_id": 102,
       "assessment_id": 203,
       "invoice_id": 304,
       "medical_record_id": 405
     }
   }
   ```
## Events APIs

### 1. **Fetch Events and Appointments for a Specific Professional**
   **Endpoint:** `GET /events/all`
   - **Query Parameter:** `professionalId` (required)
   
   **Request Payload:** 
   No payload required. The `professionalId` should be passed as a query parameter.
   
   Example Request:
   ```
   GET /events?professionalId=1
   ```

### 2. **Fetch a Single Event by ID**
   **Endpoint:** `GET /events/{eventId}`
   - **Path Parameter:** `eventId` (required)
   
   **Request Payload:** 
   No payload required.

   Example Request:
   ```
   GET /events/1
   ```

### 3. **Create a New Event**
   **Endpoint:** `POST /events/create`
   
   **Request Payload:**
   ```json
   {
     "title": "Annual Conference",
     "start_time": "2024-12-30T09:00:00",
     "end_time": "2024-12-30T17:00:00",
     "professionalId": 1
   }
   ```

   **Fields:**
   - `title` (string) - The title of the event.
   - `start_time` (string) - The start time of the event in ISO 8601 format (e.g., `"2024-12-30T09:00:00"`).
   - `end_time` (string) - The end time of the event in ISO 8601 format.
   - `professionalId` (integer) - The ID of the professional associated with the event.

### 4. **Update an Event**
   **Endpoint:** `PUT /events/{eventId}`
   - **Path Parameter:** `eventId` (required)
   
   **Request Payload:**
   ```json
   {
     "title": "Updated Annual Conference",
     "start_time": "2024-12-30T10:00:00",
     "end_time": "2024-12-30T18:00:00"
   }
   ```

   **Fields:**
   - `title` (string) - The updated title of the event.
   - `start_time` (string) - The updated start time of the event in ISO 8601 format.
   - `end_time` (string) - The updated end time of the event in ISO 8601 format.

### 5. **Delete an Event**
   **Endpoint:** `DELETE /events/{eventId}`
   - **Path Parameter:** `eventId` (required)
   
   **Request Payload:** 
   No payload required.

   Example Request:
   ```
   DELETE /events/1
   ```

## Health Tips APIs

### 1. **Create or Update a Health Tip for a Specific Client by a Professional**
   **Endpoint:** `POST /tips/create`
   
   **Request Payload:**
   ```json
   {
     "clientId": 1,
     "professionalId": 2,
     "tip": "Drink at least 8 glasses of water every day for better hydration."
   }
   ```

   **Fields:**
   - `clientId` (integer) - The ID of the client receiving the health tip.
   - `professionalId` (integer) - The ID of the professional providing the health tip.
   - `tip` (string) - The health tip message.

   **Response Example:**
   ```json
   {
     "status": "success",
     "message": "Health tip created successfully",
     "data": [
       {
         "client_id": 1,
         "professional_id": 2,
         "tip": "Drink at least 8 glasses of water every day for better hydration.",
         "created_at": "2024-12-28T12:00:00"
       }
     ]
   }
   ```

### 2. **Get All Health Tips for a Specific Client**
   **Endpoint:** `GET /tips/all/{clientId}`
   - **Path Parameter:** `clientId` (required)
   
   **Request Payload:** 
   No payload required.

   **Response Example:**
   ```json
   {
     "status": "success",
     "message": "Health tips fetched successfully",
     "data": [
       {
         "client_id": 1,
         "professional_id": 2,
         "tip": "Drink at least 8 glasses of water every day for better hydration.",
         "created_at": "2024-12-28T12:00:00"
       },
       {
         "client_id": 1,
         "professional_id": 3,
         "tip": "Exercise regularly to maintain a healthy heart.",
         "created_at": "2024-12-29T15:00:00"
       }
     ]
   }
   ```

## Journal APIs

### 1. **Get a List of All Journals**
   **Endpoint:** `GET /journals/all`
   
   **Request Payload:** 
   No payload required.

   **Response Example:**
   ```json
   [
     {
       "id": 1,
       "professional_id": 2,
       "content": "Patient reported improvement in condition after starting new treatment.",
       "created_at": "2024-12-28T12:00:00",
       "updated_at": "2024-12-28T12:00:00"
     },
     {
       "id": 2,
       "professional_id": 3,
       "content": "Follow-up visit scheduled for next week to assess progress.",
       "created_at": "2024-12-29T15:00:00",
       "updated_at": "2024-12-29T15:00:00"
     }
   ]
   ```

### 2. **Create a New Journal**
   **Endpoint:** `POST /journals/create`
   
   **Request Payload:**
   ```json
   {
     "professionalId": 2,
     "content": "Patient showed signs of improvement in mobility after therapy sessions."
   }
   ```

   **Fields:**
   - `professionalId` (integer) - The ID of the professional creating the journal.
   - `content` (string) - The content of the journal.

   **Response Example:**
   ```json
   {
     "message": "Journal created successfully",
     "data": {
       "id": 3,
       "professional_id": 2,
       "content": "Patient showed signs of improvement in mobility after therapy sessions.",
       "created_at": "2024-12-29T16:00:00",
       "updated_at": "2024-12-29T16:00:00"
     }
   }
   ```

### 3. **Get a Journal by ID**
   **Endpoint:** `GET /journals/{id}`
   - **Path Parameter:** `id` (required)
   
   **Request Payload:**
   No payload required.

   **Response Example:**
   ```json
   {
     "id": 1,
     "professional_id": 2,
     "content": "Patient reported improvement in condition after starting new treatment.",
     "created_at": "2024-12-28T12:00:00",
     "updated_at": "2024-12-28T12:00:00"
   }
   ```

### 4. **Update a Journal by ID**
   **Endpoint:** `PUT /journals/{id}`
   - **Path Parameter:** `id` (required)
   
   **Request Payload:**
   ```json
   {
     "content": "Patient reported further improvement in mobility and overall well-being."
   }
   ```

   **Fields:**
   - `content` (string) - The updated content of the journal.

   **Response Example:**
   ```json
   {
     "message": "Journal updated successfully",
     "data": {
       "id": 1,
       "professional_id": 2,
       "content": "Patient reported further improvement in mobility and overall well-being.",
       "created_at": "2024-12-28T12:00:00",
       "updated_at": "2024-12-29T17:00:00"
     }
   }
   ```

### 5. **Delete a Journal by ID**
   **Endpoint:** `DELETE /journals/{id}`
   - **Path Parameter:** `id` (required)
   
   **Request Payload:**
   No payload required.

   **Response Example:**
   ```json
   {
     "message": "Journal deleted successfully",
     "data": {
       "id": 1,
       "professional_id": 2,
       "content": "Patient reported improvement in condition after starting new treatment.",
       "created_at": "2024-12-28T12:00:00",
       "updated_at": "2024-12-28T12:00:00"
     }
   }
   ```

## Notes APIs

### 1. **Fetch Notes for a Professional and Client**
   **Endpoint:** `GET /notes/:professionalId/:clientId`
   - **Path Parameters:**
     - `professionalId` (integer) - The ID of the professional.
     - `clientId` (integer) - The ID of the client.
   
   **Request Payload:** 
   No payload required.

   **Response Example:**
   ```json
   {
     "message": "Notes fetched successfully",
     "data": [
       {
         "id": 1,
         "professional_id": 2,
         "client_id": 3,
         "content": "Client showed improvement after the last session.",
         "created_at": "2024-12-28T12:00:00",
         "updated_at": "2024-12-28T12:00:00"
       },
       {
         "id": 2,
         "professional_id": 2,
         "client_id": 3,
         "content": "Client reported increased energy levels after therapy.",
         "created_at": "2024-12-29T15:00:00",
         "updated_at": "2024-12-29T15:00:00"
       }
     ]
   }
   ```

### 2. **Create or Update Notes for a Professional and Client**
   **Endpoint:** `POST /notes/:professionalId/:clientId`
   - **Path Parameters:**
     - `professionalId` (integer) - The ID of the professional.
     - `clientId` (integer) - The ID of the client.

   **Request Payload:**
   ```json
   {
     "content": "Client's condition improved significantly after last session."
   }
   ```

   **Fields:**
   - `content` (string) - The content of the note being saved.

   **Response Example:**
   ```json
   {
     "message": "Notes saved successfully",
     "data": {
       "id": 1,
       "professional_id": 2,
       "client_id": 3,
       "content": "Client's condition improved significantly after last session.",
       "created_at": "2024-12-29T16:00:00",
       "updated_at": "2024-12-29T16:00:00"
     }
   }
   ```
## OTP APIs

### 1. **Generate OTP**
   **Endpoint:** `POST /otp/generate`
   - **Request Payload:**
   ```json
   {
     "email": "example@example.com"
   }
   ```
   
   **Response Example:**
   ```json
   {
     "message": "OTP sent successfully."
   }
   ```

### 2. **Verify OTP**
   **Endpoint:** `POST /otp/verify`
   - **Request Payload:**
   ```json
   {
     "email": "example@example.com",
     "otp": "123456"
   }
   ```
   
   **Response Example (Success):**
   ```json
   {
     "message": "OTP verified successfully."
   }
   ```
   
   **Response Example (Error - Invalid OTP):**
   ```json
   {
     "message": "Incorrect OTP."
   }
   ```
## Payment APIs

### 1. **Create Order**
- **Endpoint:** `POST /api/payments/createOrder`
- **Payload:**
  ```json
  {
    "amount": 5000,
    "currency": "INR",
    "appointmentDetails": "Appointment for psychological consultation on 12th Oct 2024"
  }
  ```

  - `amount` is the amount for the order in INR, represented in the smallest unit (paise).
  - `currency` is the currency for the order (defaults to "INR" if not provided).
  - `appointmentDetails` is a description of the appointment for which the payment is being created.

- **Response:**
  ```json
  {
    "id": "order_abc123xyz",
    "currency": "INR",
    "amount": 5000,
    "order_id": "order_abc123xyz",
    "order_link": "https://razorpay.com/checkout/abc123xyz"
  }
  ```

  - `id` is the Razorpay order ID.
  - `order_link` is the URL where the user can complete the payment.

---

### 2. **Verify Payment**
- **Endpoint:** `POST /api/payments/verifyPayment`
- **Payload:**
  ```json
  {
    "razorpay_order_id": "order_abc123xyz",
    "razorpay_payment_id": "pay_PT4nSAiyJFwSzY",
    "razorpay_signature": "signature_123abc456def"
  }
  ```

  - `razorpay_order_id` is the Razorpay order ID for which the payment is being verified.
  - `razorpay_payment_id` is the Razorpay payment ID.
  - `razorpay_signature` is the Razorpay signature generated by the Razorpay payment gateway to verify the authenticity of the payment.

- **Response:**
  ```json
  {
    "message": "Payment verified successfully",
    "payment": {
      "id": 1,
      "razorpay_order_id": "order_abc123xyz",
      "razorpay_payment_id": "pay_PT4nSAiyJFwSzY",
      "razorpay_signature": "signature_123abc456def",
      "status": "Success",
      "amount": 5000,
      "currency": "INR",
      "appointment_details": "Appointment for psychological consultation on 12th Oct 2024"
    }
  }
  ```

  - `payment` contains the details of the updated payment record from the database, including `razorpay_payment_id`, `razorpay_signature`, and the updated `status`.

---

### 3. **Get Payment Details**
- **Endpoint:** `GET /api/payments/paymentDetails/:id`
- **Payload:** No request body needed.
  - The payment ID is passed as a URL parameter (e.g., `/api/payments/1`).

- **Response:**
  ```json
  {
    "id": 1,
    "razorpay_order_id": "order_abc123xyz",
    "razorpay_payment_id": "pay_PT4nSAiyJFwSzY",
    "razorpay_signature": "signature_123abc456def",
    "status": "Success",
    "amount": 5000,
    "currency": "INR",
    "appointment_details": "Appointment for psychological consultation on 12th Oct 2024"
  }
  ```

## Professional APIs

### 1. **Get a List of All Professionals**
- **Endpoint**: `GET /professionals/all`
- **Request**: No body is required.
- **Response**: 
  - A list of all professionals in the system.
  - **Example Response**:
    ```json
    [
      {
        "id": 1,
        "full_name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "1234567890",
        "date_of_birth": "1985-01-01",
        ...
      }
    ]
    ```

### 2. **Create a New Professional**
- **Endpoint**: `POST /professionals/create`
- **Request** (Payload):
    ```json
    {
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "1234567890",
      "date_of_birth": "1985-01-01",
      "area_of_expertise": "Psychology",
      "location": "New York",
      "about_me": "Experienced psychologist.",
      "education": "Ph.D. in Clinical Psychology",
      "services": "Therapy, Counseling",
      "fees": 500,
      "availability": "Mon-Fri 9am - 5pm",
      "experience": 10,
      "social_profiles": {"linkedin": "https://linkedin.com/in/johndoe"}
    }
    ```
- **Response**:
  - A success message with the created professional details.
  - **Example Response**:
    ```json
    {
      "message": "Professional onboarded successfully",
      "data": {
        "id": 1,
        "full_name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "1234567890",
        "date_of_birth": "1985-01-01",
        ...
      }
    }
    ```

### 3. **Get Professional by ID or Name**
- **Endpoint**: `GET /professionals/:idOrName`
- **Request**:
  - **Params**: 
    - `idOrName` - either the ID or the full name of the professional.
- **Response**:
  - The details of the requested professional.
  - **Example Response**:
    ```json
    {
      "id": 1,
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "1234567890",
      "date_of_birth": "1985-01-01",
      ...
    }
    ```

### 4. **Update a Professional's Details**
- **Endpoint**: `PUT /professionals/update/:professionalId`
- **Request** (Payload):
    ```json
    {
      "full_name": "John Doe Updated",
      "email": "john.doe.updated@example.com",
      "phone": "0987654321",
      "location": "San Francisco",
      "availability": "Mon-Fri 10am - 6pm"
    }
    ```
- **Response**:
  - A success message with the updated professional details.
  - **Example Response**:
    ```json
    {
      "message": "Professional updated successfully",
      "data": {
        "id": 1,
        "full_name": "John Doe Updated",
        "email": "john.doe.updated@example.com",
        "phone": "0987654321",
        "location": "San Francisco",
        "availability": "Mon-Fri 10am - 6pm",
        ...
      }
    }
    ```

### 5. **Delete a Professional**
- **Endpoint**: `DELETE /professionals/delete/:professionalId`
- **Request**:
  - **Params**:
    - `professionalId` - ID of the professional to delete.
- **Response**:
  - A success message confirming deletion.
  - **Example Response**:
    ```json
    {
      "message": "Professional deleted successfully",
      "data": {
        "id": 1,
        "full_name": "John Doe",
        "email": "john.doe@example.com",
        ...
      }
    }
    ```

### 6. **Search for Clients and Professionals by Keyword**
- **Endpoint**: `GET /professionals/search/:keyword`
- **Request**:
  - **Params**:
    - `keyword` - Search term to match against names and emails.
- **Response**:
  - A list of matching clients and professionals.
  - **Example Response**:
    ```json
    {
      "message": "Search results",
      "data": {
        "clients": [
          {
            "id": 1,
            "name": "Alice"
          }
        ],
        "professionals": [
          {
            "id": 2,
            "name": "John Doe"
          }
        ]
      }
    }
    ```

### 7. **Get Professional by Email**
- **Endpoint**: `GET /professionals/email/:email`
- **Request**:
  - **Params**:
    - `email` - Email of the professional to fetch.
- **Response**:
  - The details of the requested professional.
  - **Example Response**:
    ```json
    {
      "id": 1,
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "1234567890",
      "date_of_birth": "1985-01-01",
      ...
    }
    ```

## Send Email Api

### Endpoint
**POST** `/api/send/new`

### Request Payload
```json
{
  "email": "recipient@example.com",
  "content": "https://sereneminds.com/book-appointment?session=1234",
  "psychologistName": "Dr. John Doe"
}
```



## Scripts

- `npm start` - Start the application in development mode.
- `npm run dev` - Start the application with live reload (if nodemon is installed).

## Dependencies

- [Express](https://expressjs.com/) - Web framework for Node.js
- [pg](https://node-postgres.com/) - PostgreSQL client for Node.js
- [Supabase](https://supabase.com/) - Open-source Firebase alternative with PostgreSQL
- [nodemailer](https://nodemailer.com/) - For sending email notifications
- [dotenv](https://www.npmjs.com/package/dotenv) - For loading environment variables
- [cors](https://www.npmjs.com/package/cors) - For handling Cross-Origin Resource Sharing
