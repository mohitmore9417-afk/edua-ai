-- Add file_url column to assignments table
ALTER TABLE assignments ADD COLUMN file_url TEXT;

-- Create storage bucket for assignment files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assignment-files', 'assignment-files', false);

-- Allow teachers to upload assignment files
CREATE POLICY "Teachers can upload assignment files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'assignment-files' AND
  auth.uid() IN (
    SELECT teacher_id FROM classes WHERE id = (storage.foldername(name))[1]::uuid
  )
);

-- Allow class members to view assignment files
CREATE POLICY "Class members can view assignment files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'assignment-files' AND
  auth.uid() IN (
    SELECT teacher_id FROM classes WHERE id = (storage.foldername(name))[1]::uuid
    UNION
    SELECT student_id FROM class_enrollments WHERE class_id = (storage.foldername(name))[1]::uuid
  )
);