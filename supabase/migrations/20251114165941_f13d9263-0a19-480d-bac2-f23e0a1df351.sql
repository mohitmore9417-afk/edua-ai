-- Drop the problematic upload policy
DROP POLICY IF EXISTS "Teachers can upload assignment files" ON storage.objects;

-- Create a simpler policy that allows any teacher to upload
CREATE POLICY "Teachers can upload assignment files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'assignment-files' AND
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'teacher'::user_role)
);

-- Allow teachers to update their uploaded files
CREATE POLICY "Teachers can update assignment files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'assignment-files' AND
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'teacher'::user_role)
);

-- Allow teachers to delete their uploaded files
CREATE POLICY "Teachers can delete assignment files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'assignment-files' AND
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'teacher'::user_role)
);