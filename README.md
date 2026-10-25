# My Web App

A personal web app with a **Blog** and **Calendar with countdowns**.

## Project Structure

```
webapp/
├── backend/
│   ├── main.py           # FastAPI app
│   └── requirements.txt  # Python dependencies
└── frontend/
    ├── index.html        # App shell
    ├── style.css         # Styles
    └── app.js            # All frontend logic
```

---

## Setup & Run

### 1. Backend (Python / FastAPI)

Open a terminal in the `backend/` folder:

```bash
cd backend

# Create a virtual environment (recommended)
python -m venv venv

# Activate it:
# Mac/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload
```

The API will be running at: **http://localhost:8000**

You can also view the auto-generated API docs at: **http://localhost:8000/docs**

---

### 2. Frontend (HTML / JS)

Open a second terminal in the `frontend/` folder and run a simple server:

```bash
cd frontend

# Python 3
python -m http.server 3000
```

Then open your browser at: **http://localhost:3000**

---

## Features

### Blog
- Create, edit, delete posts
- Save as Draft or Publish
- Filter by All / Published / Drafts

### Calendar
- Visual monthly calendar
- Click any date to add an event
- Countdown shows days until each event (or days since past events)
- Events marked with a blue dot on the calendar

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /posts            | Get all posts |
| GET    | /posts?status=published | Filter by status |
| GET    | /posts/{id}       | Get one post |
| POST   | /posts            | Create post |
| PUT    | /posts/{id}       | Update post |
| DELETE | /posts/{id}       | Delete post |
| GET    | /events           | Get all events (with countdown) |
| POST   | /events           | Create event |
| PUT    | /events/{id}      | Update event |
| DELETE | /events/{id}      | Delete event |
