from fastapi import FastAPI
from pydantic import BaseModel
import spacy
from spacy.pipeline import EntityRuler

# Load the spaCy model
nlp = spacy.load('en_core_web_sm')

# Add custom entities
ruler = nlp.add_pipe('entity_ruler', before='ner')
patterns = [
    {"label": "BUSINESS_TYPE", "pattern": [{"LOWER": "cafe"}]},
    {"label": "BUSINESS_TYPE", "pattern": [{"LOWER": "restaurant"}]},
    {"label": "LOCATION", "pattern": [{"LOWER": "downtown"}]},
    # Add more patterns as needed
]
ruler.add_patterns(patterns)

app = FastAPI()

class Message(BaseModel):
    text: str

@app.post("/parse")
async def parse_message(message: Message):
    doc = nlp(message.text)
    entities = [(ent.text, ent.label_) for ent in doc.ents]
    tokens = [token.text for token in doc]
    return {
        "tokens": tokens,
        "entities": entities
    }