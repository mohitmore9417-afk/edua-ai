-- Create resources table for file sharing
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- RLS policies for resources
CREATE POLICY "Class members can view resources"
  ON public.resources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = resources.class_id
      AND (
        c.teacher_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM class_enrollments ce
          WHERE ce.class_id = c.id AND ce.student_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Teachers can manage resources"
  ON public.resources
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = resources.class_id AND c.teacher_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for resources
INSERT INTO storage.buckets (id, name, public)
VALUES ('class-resources', 'class-resources', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for resources bucket
CREATE POLICY "Class members can view resource files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'class-resources'
    AND EXISTS (
      SELECT 1 FROM public.resources r
      JOIN classes c ON c.id = r.class_id
      WHERE r.file_url LIKE '%' || name
      AND (
        c.teacher_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM class_enrollments ce
          WHERE ce.class_id = c.id AND ce.student_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Teachers can upload resource files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'class-resources'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Teachers can delete resource files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'class-resources'
    AND auth.uid() IS NOT NULL
  );