-- Create timetable table
CREATE TABLE public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject TEXT NOT NULL,
  room TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;

-- Timetable policies
CREATE POLICY "Class members can view timetable"
  ON public.timetable FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id 
      AND (c.teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.class_enrollments ce
        WHERE ce.class_id = c.id AND ce.student_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Teachers can manage timetable"
  ON public.timetable FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id AND c.teacher_id = auth.uid()
    )
  );

-- Create assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  file_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  grade INTEGER,
  ai_feedback TEXT,
  teacher_feedback TEXT,
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES public.profiles(id),
  UNIQUE(assignment_id, student_id)
);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Submission policies
CREATE POLICY "Students can view own submissions"
  ON public.assignment_submissions FOR SELECT
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.classes c ON c.id = a.class_id
      WHERE a.id = assignment_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can submit assignments"
  ON public.assignment_submissions FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own submissions"
  ON public.assignment_submissions FOR UPDATE
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can grade submissions"
  ON public.assignment_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.classes c ON c.id = a.class_id
      WHERE a.id = assignment_id AND c.teacher_id = auth.uid()
    )
  );

-- Update triggers
CREATE TRIGGER update_timetable_updated_at
  BEFORE UPDATE ON public.timetable
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();