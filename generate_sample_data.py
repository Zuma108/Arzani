import json
import random

industries = [
    "Agriculture", "Automotive & Boat", "Beauty & Personal Care", 
    "Building & Construction", "Communication & Media", 
    "Education & Children", "Entertainment & Recreation", 
    "Financial Services", "Health Care & Fitness", "Manufacturing",
    "Online & Technology", "Pet Services", "Restaurants & Food",
    "Retail", "Service Businesses", "Transportation & Storage", 
    "Travel", "Wholesale & Distributors", "Other"
]

locations = [
    "London", "Manchester", "Liverpool", "Birmingham", 
    "Glasgow", "Edinburgh", "Leeds", "Bristol", "Oxford", "Cambridge"
]

descriptions = [
    "A thriving business ready for expansion.",
    "Well-established with a strong customer base.",
    "A unique opportunity in a growing industry.",
    "Fully operational and highly profitable.",
    "Perfect for new or experienced entrepreneurs."
]

def generate_businesses(num=500):
    businesses = []
    for _ in range(num):
        industry = random.choice(industries)
        location = random.choice(locations)
        price = random.randint(50000, 10000000)
        description = random.choice(descriptions)
        businesses.append({
            "industry": industry,
            "location": location,
            "price": f"£{price:,}",
            "description": description
        })
    return businesses

# Generate and display sample data
sample_data = generate_businesses()
with open('sample_data.json', 'w') as f:
    json.dump(sample_data, f, indent=4)

