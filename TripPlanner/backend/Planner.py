from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import json
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
import firebase_admin
from firebase_admin import credentials, auth, firestore

app = Flask(__name__)
CORS(app, 
     resources={
         r"/*": {
             "origins": ["http://localhost:3000", "https://ai-trip-planner-bgh1z61cg-animesh-khare-aks-projects.vercel.app", "https://ai-trip-planner.vercel.app", "https://ai-trip-planner-n1yrkjurp-animesh-khare-aks-projects.vercel.app"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Authorization", "Content-Type"],
             "supports_credentials": True,
             "expose_headers": ["Content-Disposition"]
         }
     })

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    allowed_origins = ["http://localhost:3000", "https://ai-trip-planner-bgh1z61cg-animesh-khare-aks-projects.vercel.app", "https://ai-trip-planner.vercel.app", "https://ai-trip-planner-n1yrkjurp-animesh-khare-aks-projects.vercel.app"]
    if origin in allowed_origins or (origin and origin.endswith('.vercel.app')):
        response.headers['Access-Control-Allow-Origin'] = origin
    response.headers.add('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Initialize Firebase
firebase_creds_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
if firebase_creds_json:
    cred_dict = json.loads(firebase_creds_json)
    cred = credentials.Certificate(cred_dict)
else:
    cred = credentials.Certificate("./firebase-credentials.json")

firebase_admin.initialize_app(cred)
db = firestore.client()  

llm = ChatGroq(
    temperature=0,
    groq_api_key=os.getenv("GROQ_API_KEY", "your_groq_api_key_here"),
    model_name="llama-3.3-70b-versatile"
)

import os

# APIs
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "24e08fa8860b3e3d269b0bd427ac450d")
BUDGET_API_KEY = os.getenv("BUDGET_API_KEY", "your_budget_api_key_here")

itinerary_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful travel assistant. Create a multi-day trip itinerary for {city} based on the user's interests: {interests}. Optimize routes and include estimated costs."),
    ("human", "Create an itinerary for my trip."),
])

recommendation_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a travel expert. Suggest additional recommendations for {city} based on interests: {interests}. Provide unique and valuable suggestions."),
    ("human", "Give me travel recommendations."),
])

def get_weather(city):
    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={WEATHER_API_KEY}&units=metric"
    response = requests.get(url)
    return response.json() if response.status_code == 200 else {"error": "Weather data unavailable"}

def estimate_budget(city, days):
    return {
        "flights": 200 + (days * 50),
        "accommodation": days * 80,
        "food": days * 40,
        "total": 200 + (days * 50) + (days * 80) + (days * 40)
    }

@app.route('/plan-trip', methods=['POST'])
def plan_trip():
    try:
        data = request.get_json()
        city = data.get("city", "").strip()
        interests_input = data.get("interests", "")
        days = int(data.get("days", 1)) 

        if not city:
            return jsonify({"error": "City is required"}), 400
        
        if isinstance(interests_input, str):
            interests = [interest.strip() for interest in interests_input.split(",") if interest.strip()]
        elif isinstance(interests_input, list):
            interests = [interest.strip() for interest in interests_input if interest.strip()]
        else:
            return jsonify({"error": "Interests must be a comma-separated string or list"}), 400

        if not interests:
            return jsonify({"error": "At least one interest is required"}), 400

        itinerary_prompt = ChatPromptTemplate.from_messages([
            ("system", f"""You are a helpful travel assistant. Create a detailed {days}-day trip itinerary for {city} based on these interests: {', '.join(interests)}.
            For each day, include:
            - Morning activities
            - Afternoon activities
            - Evening activities
            - Recommended restaurants
            - Estimated costs
            - Travel time between locations
            Optimize the route to minimize travel time between locations."""),
            ("human", f"Create a {days}-day itinerary for my trip to {city}")
        ])

        itinerary_response = llm.invoke(itinerary_prompt.format_messages())
        if not itinerary_response:
            return jsonify({"error": "Failed to generate itinerary"}), 500

        recommendation_response = llm.invoke(recommendation_prompt.format_messages(
            city=city, 
            interests=", ".join(interests),
            days=days
        ))

        weather = get_weather(city)
        budget = estimate_budget(city, days)

        return jsonify({
            "itinerary": itinerary_response.content,
            "recommendations": recommendation_response.content if recommendation_response else "No recommendations available.",
            "weather": weather,
            "budget": budget,
            "status": "success"
        }), 200

    except Exception as e:
        return jsonify({
            "error": f"Failed to plan trip: {str(e)}",
            "status": "error"
        }), 500

@app.route('/save-itinerary', methods=['POST'])
def save_itinerary():
    try:
        print("Received save-itinerary request")
        auth_header = request.headers.get('Authorization', '')
        if not auth_header:
            print("No Authorization header")
            return jsonify({'success': False, 'error': 'No Authorization header'}), 401
            
        token = auth_header.split('Bearer ')[-1]
        try:
            decoded_token = auth.verify_id_token(token)
            user_id = decoded_token['uid']
            print(f"User authenticated: {user_id}")
        except Exception as auth_e:
            print(f"Auth error: {str(auth_e)}")
            return jsonify({'success': False, 'error': f'Auth error: {str(auth_e)}'}), 401

        data = request.get_json()
        print(f"Saving itinerary data: {data.keys()}")
        
        itinerary_data = {
            'title': data.get('title', f"Trip to {data.get('city', 'Unknown')}"),
            'city': data.get('city'),
            'days': data.get('days'),
            'interests': data.get('interests', []),
            'itinerary': data.get('itinerary'),
            'recommendations': data.get('recommendations'),
            'weather': data.get('weather'),
            'budget': data.get('budget'),
            'created_at': firestore.SERVER_TIMESTAMP
        }

        doc_ref = db.collection('users').document(user_id).collection('itineraries').add(itinerary_data)
        print(f"Itinerary saved with ID: {doc_ref[1].id}")
        
        return jsonify({
            'success': True,
            'itineraryId': doc_ref[1].id,
            'message': 'Itinerary saved successfully'
        }), 200

    except Exception as e:
        print(f"Error saving itinerary: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/get-itineraries', methods=['GET'])
def get_user_itineraries():
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'success': False,
                'error': 'Missing or invalid authorization token',
                'code': 'AUTH_HEADER_MISSING'
            }), 401

        token = auth_header.split('Bearer ')[1]
        
        try:
            decoded_token = auth.verify_id_token(token)
            user_id = decoded_token['uid']
        except Exception as auth_error:
            return jsonify({
                'success': False,
                'error': f'Invalid token: {str(auth_error)}',
                'code': 'INVALID_TOKEN'
            }), 401

        if not db:
            return jsonify({
                'success': False,
                'error': 'Database connection not established',
                'code': 'DB_CONNECTION_FAILED'
            }), 500

        try:
            query = db.collection('users').document(user_id)\
                     .collection('itineraries')\
                     .order_by('created_at', direction='DESCENDING')
            
            docs = query.stream()
            
            itineraries = []
            for doc in docs:
                try:
                    doc_data = doc.to_dict()
                    itinerary = {
                        'id': doc.id,
                        'title': doc_data.get('title', 'Untitled Trip'),
                        'city': doc_data.get('city', 'Unknown'),
                        'days': doc_data.get('days', 1),
                        'created_at': doc_data.get('created_at', '').strftime('%Y-%m-%d') 
                            if hasattr(doc_data.get('created_at'), 'strftime') 
                            else str(doc_data.get('created_at', ''))
                    }
                    for field in ['interests', 'itinerary', 'recommendations', 'weather', 'budget']:
                        if field in doc_data:
                            itinerary[field] = doc_data[field]
                    
                    itineraries.append(itinerary)
                except Exception as doc_error:
                    print(f"Error processing document {doc.id}: {str(doc_error)}")
                    continue

            return jsonify({
                'success': True,
                'count': len(itineraries),
                'itineraries': itineraries
            }), 200

        except Exception as db_error:
            print(f"Firestore error: {str(db_error)}")
            return jsonify({
                'success': False,
                'error': 'Database operation failed',
                'details': str(db_error),
                'code': 'DB_OPERATION_FAILED'
            }), 500

    except Exception as e:
        print(f"Unexpected error in get_user_itineraries: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'details': str(e),
            'code': 'INTERNAL_SERVER_ERROR'
        }), 500
@app.route('/delete-itinerary/<itinerary_id>', methods=['DELETE'])
def delete_itinerary(itinerary_id):
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Missing token'}), 401

        token = auth_header.split('Bearer ')[1]
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token['uid']

        # Delete the document from the user's subcollection
        db.collection('users').document(user_id).collection('itineraries').document(itinerary_id).delete()

        return jsonify({'success': True, 'message': 'Itinerary deleted successfully'}), 200
    except Exception as e:
        print(f"Error deleting itinerary: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/verify-token', methods=['POST'])
def verify_token():
    token = request.json.get('token')
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        
        return jsonify({'success': True, 'uid': uid}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 401

@app.route('/save-user', methods=['POST'])
def save_user():
    data = request.json
    try:
        decoded_token = auth.verify_id_token(data['token'])
        uid = decoded_token['uid']
        
        user_data = {
            'email': data['email'],
            'firebase_uid': uid,
            'created_at': firestore.SERVER_TIMESTAMP
        }
        
        db.collection("users").document(uid).set(user_data)
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        user = auth.create_user(email=email, password=password)
        return jsonify({"message": "User created successfully", "user_id": user.uid}), 200
    except Exception as e:
        return jsonify({"error": f"Error signing up: {str(e)}"}), 500

@app.route('/login', methods=['POST'])
def login():
    return jsonify({"message": "Login functionality handled by Firebase Client SDK"})

@app.route('/find-hotels', methods=['POST'])
def find_hotels():
    try:
        data = request.get_json()
        city = data.get("city", "").strip()
        
        if not city:
            return jsonify({"error": "City is required"}), 400

        hotel_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a hotel booking assistant. Find 5 top-rated hotels in {city}. 
            Return the response ONLY as a valid JSON array of objects. Do not include any markdown formatting or text outside the JSON.
            Each object must have these fields:
            - id: a unique string id (e.g., "h1")
            - name: Hotel Name
            - rating: Star rating (number 1-5)
            - price: Price per night in USD (number)
            - address: Short address
            - image: A keyword for an image (e.g., "luxury", "resort", "city", "boutique")
            - amenities: List of strings (e.g., ["Pool", "WiFi", "Spa"])
            - description: Short description (max 20 words)
            """),
            ("human", f"Find hotels in {city}")
        ])

        response = llm.invoke(hotel_prompt.format_messages(city=city))
        content = response.content.strip()
        
        # Clean up potential markdown code blocks if the LLM adds them
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
            
        import json
        hotels = json.loads(content.strip())
        
        return jsonify({"success": True, "hotels": hotels}), 200

    except Exception as e:
        print(f"Error finding hotels: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/book-hotel', methods=['POST'])
def book_hotel():
    try:
        data = request.get_json()
        token = data.get('token')
        booking_details = data.get('bookingDetails')
        
        if not token or not booking_details:
            return jsonify({"error": "Missing token or booking details"}), 400

        # Verify user
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        
        # Add timestamp and user ID
        booking_data = {
            'user_id': uid,
            'hotel': booking_details,
            'created_at': firestore.SERVER_TIMESTAMP,
            'status': 'confirmed'
        }
        
        # Save to Firestore
        doc_ref = db.collection("bookings").add(booking_data)
        
        return jsonify({"success": True, "bookingId": doc_ref[1].id}), 200

    except Exception as e:
        print(f"Error booking hotel: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)