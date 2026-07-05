# \scripts\db_connection.py
import os
from dotenv import load_dotenv
# Import ClientOptions if you might use it for other settings like headers/schema later
from supabase import create_client, Client, ClientOptions

# Load environment variables from .env file in the current directory
load_dotenv()

def get_supabase_client() -> Client:
    """
    Initializes and returns a Supabase client instance using environment variables.

    Uses the SERVICE ROLE KEY for administrative access, bypassing RLS.
    Ensure the key is kept secret and secure. For supabase==2.15.0, specific auth
    options like auto_refresh_token are not passed directly to ClientOptions.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url:
        raise ValueError("Supabase URL not set in environment variables (SUPABASE_URL).")
    if not key:
        raise ValueError("Supabase Service Role Key not set in environment variables (SUPABASE_SERVICE_ROLE_KEY).")

    try:
        # --- Corrected Options for supabase==2.15.0 ---
        # Initialize ClientOptions without the auth-related arguments that caused the TypeError.
        # The library likely handles defaults appropriately when the service key is provided.
        # If you needed to set headers or schema, you would pass them here, e.g.:
        # options = ClientOptions(schema="public", headers={"X-Custom": "Value"})
        options = ClientOptions() # Create default options object
        # --- End Correction ---

        # Pass the ClientOptions instance using the 'options' keyword argument.
        # Alternatively, you could try passing options=None or omitting it if
        # ClientOptions() is not needed, but this is safer for future additions.
        supabase: Client = create_client(url, key, options=options)

        print("Supabase client initialized successfully (using Service Role Key - RLS bypassed).")
        return supabase
    except Exception as e:
        print(f"Error initializing Supabase client: {e}")
        raise # Re-raise the exception after printing