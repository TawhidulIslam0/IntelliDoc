import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
from pwdlib import PasswordHash

# Change this to a long random secret in production 
# This is a dummy variable to generate JWT tokens in development
SECRET_KEY = "9f7bbeb810739079d79290c3da1cbe0c276eb6d67ba27e8c034e32181ea8077b"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # one day

pwd_hash = PasswordHash.recommended()

def hash_password(password: str) -> str:
    return pwd_hash.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_hash.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode["exp"] = expire
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt