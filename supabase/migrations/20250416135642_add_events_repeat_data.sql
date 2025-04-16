
-- Add repeat_data column to events table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'repeat_data'
    ) THEN
        ALTER TABLE "public"."events" 
        ADD COLUMN "repeat_data" jsonb;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'end_date'
    ) THEN
        ALTER TABLE "public"."events" 
        ADD COLUMN "end_date" timestamp with time zone;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE "public"."events" 
        ADD COLUMN "type" text DEFAULT 'other' NOT NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'folder_id'
    ) THEN
        ALTER TABLE "public"."events" 
        ADD COLUMN "folder_id" uuid REFERENCES folders(id) ON DELETE SET NULL;
    END IF;
END $$;
