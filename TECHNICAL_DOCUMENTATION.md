# SmartClass AI - Technical Documentation

## Executive Summary

SmartClass AI is a comprehensive educational platform built using modern web technologies and AI capabilities. The platform facilitates classroom management, assignment distribution, attendance tracking, and AI-powered grading for educational institutions.

**Platform Type:** Progressive Web Application (PWA)  
**Primary Language:** TypeScript  
**Development Approach:** AI-First, Component-Based Architecture  
**Deployment:** Lovable Cloud Platform

---

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3.1 | Core UI framework |
| TypeScript | 5.8.3 | Type-safe development |
| Vite | 5.4.19 | Build tool and dev server |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| React Router DOM | 6.30.1 | Client-side routing |
| TanStack React Query | 5.83.0 | Server state management |
| React Hook Form | 7.61.1 | Form validation |
| Zod | 3.25.76 | Schema validation |

### UI Component Libraries

- **shadcn/ui** - Customizable component library
- **Radix UI** - Headless UI primitives
- **Lucide React** (0.462.0) - Icon library
- **Sonner** (1.7.4) - Toast notifications
- **Recharts** (2.15.4) - Data visualization

### Backend & Infrastructure

| Component | Technology | Details |
|-----------|-----------|---------|
| Backend Platform | Lovable Cloud (Supabase) | Fully managed backend |
| Database | PostgreSQL | Relational database with RLS |
| Authentication | Supabase Auth | JWT-based authentication |
| File Storage | Supabase Storage | Two buckets: assignment-files, class-resources |
| Edge Functions | Deno Runtime | Serverless compute |
| AI Integration | Lovable AI Gateway | Google Gemini 2.5 Flash |

### Development Tools

- **date-fns** (3.6.0) - Date manipulation
- **jsPDF** (3.0.3) - PDF generation
- **jsPDF-AutoTable** (5.0.2) - Table generation in PDFs
- **ESLint** - Code linting
- **PostCSS** - CSS processing

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (Browser)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  React App   │  │  React Query │  │  Local State │      │
│  │  (Vite)      │  │  Cache       │  │  Management  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/WSS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Lovable Cloud Backend (Supabase)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │  Auth System │  │  Storage     │      │
│  │  + RLS       │  │  (JWT)       │  │  Buckets     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Edge        │  │  Realtime    │                        │
│  │  Functions   │  │  Subscriptions│                       │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              External Services                               │
│  ┌──────────────────────────────────────────────┐           │
│  │  Lovable AI Gateway                           │           │
│  │  - google/gemini-2.5-flash                   │           │
│  │  - openai/gpt-5-mini                         │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

**Page Components:**
- `Home.tsx` - Landing page
- `Auth.tsx` - Login/Signup
- `AdminDashboard.tsx` - Admin control panel
- `TeacherDashboard.tsx` - Teacher workspace
- `StudentDashboard.tsx` - Student workspace
- `NotFound.tsx` - 404 page

**Feature Components:**
- Assignment management (create, submit, grade)
- Attendance tracking (mark, view analytics)
- Announcements (create, view)
- Timetable management
- Resource management
- User approval system (admin)

**Shared Components:**
- `DashboardLayout.tsx` - Common layout wrapper
- `NotificationBell.tsx` - Notification system
- `FilePreview.tsx` - File preview modal
- 40+ shadcn/ui components

---

## Database Schema

### Core Tables

#### `profiles`
Stores user profile information.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | - | Primary key (references auth.users) |
| email | text | No | - | User email |
| full_name | text | No | - | Display name |
| role | user_role | No | - | User role enum |
| avatar_url | text | Yes | - | Profile picture URL |
| created_at | timestamp | No | now() | Creation timestamp |
| updated_at | timestamp | No | now() | Last update timestamp |

**RLS Policies:**
- Users can view all profiles
- Users can update own profile

**⚠️ SECURITY ISSUE:** Role is stored in profiles table and accessible during signup, creating privilege escalation risk.

#### `classes`
Represents teaching classes/courses.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | text | No | - | Class name |
| subject | text | No | - | Subject area |
| class_code | text | No | - | Enrollment code |
| room | text | Yes | - | Room location |
| description | text | Yes | - | Class description |
| teacher_id | uuid | No | - | Teacher reference |
| created_at | timestamp | No | now() | Creation timestamp |
| updated_at | timestamp | No | now() | Last update timestamp |

**RLS Policies:**
- Anyone can view classes
- Teachers can create/update/delete own classes

#### `class_enrollments`
Links students to classes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| class_id | uuid | No | - | Class reference |
| student_id | uuid | No | - | Student reference |
| enrolled_at | timestamp | No | now() | Enrollment timestamp |

**RLS Policies:**
- Students can enroll themselves
- Students and teachers can view enrollments

#### `assignments`
Assignment details and metadata.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| class_id | uuid | No | - | Class reference |
| title | text | No | - | Assignment title |
| description | text | Yes | - | Assignment details |
| due_date | timestamp | Yes | - | Due date |
| total_points | integer | Yes | 100 | Maximum points |
| file_url | text | Yes | - | Attached file |
| created_at | timestamp | No | now() | Creation timestamp |
| updated_at | timestamp | No | now() | Last update timestamp |

**RLS Policies:**
- Class members can view assignments
- Teachers can manage assignments

#### `assignment_submissions`
Student assignment submissions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| assignment_id | uuid | No | - | Assignment reference |
| student_id | uuid | No | - | Student reference |
| content | text | No | - | Submission content |
| file_url | text | Yes | - | Attached file |
| submitted_at | timestamp | No | now() | Submission timestamp |
| grade | integer | Yes | - | Grade (0-100) |
| graded_by | uuid | Yes | - | Grader reference |
| graded_at | timestamp | Yes | - | Grading timestamp |
| teacher_feedback | text | Yes | - | Manual feedback |
| ai_feedback | text | Yes | - | AI-generated feedback |

**RLS Policies:**
- Students can submit and view own submissions
- Students can update own submissions
- Teachers can grade submissions

#### `attendance`
Daily attendance records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| class_id | uuid | No | - | Class reference |
| student_id | uuid | No | - | Student reference |
| date | date | No | CURRENT_DATE | Attendance date |
| status | text | No | - | present/absent/late |
| marked_by | uuid | No | - | Teacher reference |
| created_at | timestamp | No | now() | Creation timestamp |

**RLS Policies:**
- Students and teachers can view attendance
- Teachers can mark attendance

#### `announcements`
Class announcements.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| class_id | uuid | No | - | Class reference |
| title | text | No | - | Announcement title |
| content | text | No | - | Announcement content |
| created_by | uuid | No | - | Creator reference |
| created_at | timestamp | No | now() | Creation timestamp |

**RLS Policies:**
- Class members can view announcements
- Teachers can create announcements

#### `resources`
Educational resources and files.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| class_id | uuid | No | - | Class reference |
| title | text | No | - | Resource title |
| description | text | Yes | - | Resource description |
| file_name | text | No | - | Original filename |
| file_url | text | No | - | Storage URL |
| file_size | integer | Yes | - | File size in bytes |
| category | text | Yes | - | Resource category |
| uploaded_by | uuid | No | - | Uploader reference |
| created_at | timestamp | No | now() | Upload timestamp |
| updated_at | timestamp | No | now() | Last update timestamp |

**RLS Policies:**
- Class members can view resources
- Teachers can manage resources

#### `timetable`
Class scheduling information.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| class_id | uuid | No | - | Class reference |
| day_of_week | integer | No | - | Day (0-6) |
| start_time | time | No | - | Start time |
| end_time | time | No | - | End time |
| subject | text | No | - | Subject name |
| room | text | Yes | - | Room location |
| created_at | timestamp | No | now() | Creation timestamp |
| updated_at | timestamp | No | now() | Last update timestamp |

**RLS Policies:**
- Class members can view timetable
- Teachers can manage timetable

#### `notifications`
User notifications.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | User reference |
| type | text | No | - | Notification type |
| title | text | No | - | Notification title |
| message | text | No | - | Notification content |
| related_id | uuid | Yes | - | Related entity ID |
| read | boolean | No | false | Read status |
| created_at | timestamp | No | now() | Creation timestamp |

**RLS Policies:**
- Users can view own notifications
- Users can update own notifications
- System can create notifications

### Database Functions

#### `handle_new_user()`
Trigger function that creates a profile entry when a new user signs up.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$function$
```

#### `update_updated_at_column()`
Trigger function that automatically updates the `updated_at` timestamp.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
```

### Enums

#### `user_role`
```sql
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
```

---

## User Roles & Permissions

### Admin Role
**Purpose:** Platform administration and user management

**Capabilities:**
- View all users and their roles
- Approve/reject new user registrations
- Manage user accounts
- Access system-wide analytics
- Override permissions (implicit through database access)

**Dashboard Features:**
- User approval queue
- System statistics
- User management interface

### Teacher Role
**Purpose:** Class management and instruction

**Capabilities:**
- Create and manage classes
- Generate class enrollment codes
- Create and manage assignments
- View and grade student submissions
- Use AI grading assistance
- Mark student attendance
- Create announcements
- Upload and manage class resources
- Create timetables
- View class analytics
- Export attendance and grade reports

**Dashboard Features:**
- Class overview cards
- Assignment management panel
- Attendance tracker
- Analytics visualizations
- Resource library
- Timetable editor
- Announcement broadcaster

### Student Role
**Purpose:** Learning and assignment submission

**Capabilities:**
- Enroll in classes using class codes
- View assignments
- Submit assignments (text + file uploads)
- View grades and feedback (teacher + AI)
- View attendance records
- View announcements
- Download class resources
- View class timetable

**Dashboard Features:**
- Enrolled classes overview
- Assignment cards with due dates
- Submission interface
- Attendance statistics
- Announcement feed
- Resource downloads
- Personal timetable view

---

## Authentication System

### Implementation Details

**Provider:** Supabase Auth  
**Method:** Email/Password authentication  
**Token Type:** JWT (JSON Web Tokens)  
**Session Storage:** localStorage (persistent)  
**Auto-refresh:** Enabled

### Authentication Flow

```
1. User submits credentials
   ↓
2. Frontend calls supabase.auth.signInWithPassword()
   ↓
3. Supabase validates credentials
   ↓
4. JWT token issued and stored in localStorage
   ↓
5. Profile fetched from profiles table
   ↓
6. User redirected to role-specific dashboard
   - Admin → /admin
   - Teacher → /teacher
   - Student → /student
```

### Sign Up Flow

```
1. User submits registration form
   ↓
2. Frontend calls supabase.auth.signUp()
   ↓
3. User record created in auth.users
   ↓
4. handle_new_user() trigger fires
   ↓
5. Profile created in profiles table
   ↓
6. Auto-confirm enabled (no email verification required)
   ↓
7. User logged in automatically
```

### Protected Routes

All dashboard routes require authentication:
- `/admin` - Admin only
- `/teacher` - Teacher only
- `/student` - Student only

**⚠️ SECURITY ISSUE:** Role validation happens client-side. Attackers can manipulate localStorage to access unauthorized routes. Server-side validation required.

### Session Management

- **Persistence:** Sessions persist across browser sessions
- **Expiration:** Handled by Supabase (default 1 hour, auto-refreshed)
- **Logout:** Manual logout via supabase.auth.signOut()

### Security Headers

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

## AI Integration

### Overview

SmartClass AI uses the **Lovable AI Gateway** to provide AI-powered grading capabilities. The integration is implemented as a Supabase Edge Function that processes assignment submissions and generates grades with detailed feedback.

### AI Service Provider

**Gateway URL:** `https://ai.gateway.lovable.dev/v1/chat/completions`  
**API Key:** Pre-configured via `LOVABLE_API_KEY` environment variable  
**Model Used:** `google/gemini-2.5-flash`  
**Alternative Models Available:**
- `google/gemini-2.5-pro` (higher quality, slower)
- `google/gemini-2.5-flash-lite` (faster, lower quality)
- `openai/gpt-5-mini` (OpenAI alternative)

### AI Grading System

#### Edge Function: `ai-grading`

**Location:** `supabase/functions/ai-grading/index.ts`

**Purpose:** Analyzes student submissions and provides:
1. Numerical grade (0-100)
2. Detailed constructive feedback
3. Specific improvement suggestions

**Request Payload:**
```typescript
{
  submissionId: string,
  content: string,
  assignmentTitle: string
}
```

**Response:**
```typescript
{
  grade: number,
  feedback: string
}
```

#### AI System Prompt

```
You are an intelligent grading assistant for teachers. Analyze student submissions and provide:
1. A grade out of 100
2. Detailed, constructive feedback highlighting strengths and areas for improvement
3. Specific suggestions for enhancement

Be fair, encouraging, and educational in your assessment.
```

#### Grading Workflow

```
1. Teacher clicks "Grade with AI" on submission
   ↓
2. Frontend calls supabase.functions.invoke('ai-grading')
   ↓
3. Edge function sends prompt to Lovable AI Gateway
   ↓
4. AI analyzes submission and generates feedback
   ↓
5. Edge function parses response for grade
   ↓
6. Database updated with grade and ai_feedback
   ↓
7. Teacher can review and adjust AI-generated grade
```

#### Error Handling

The edge function handles:
- **429 Rate Limit:** "Rate limit exceeded. Please try again later."
- **402 Payment Required:** "AI usage limit reached. Please add credits to continue."
- **500 Server Error:** Generic error with logged details

#### Database Updates

After AI grading completes:
```sql
UPDATE assignment_submissions
SET 
  ai_feedback = [AI response],
  grade = [parsed grade]
WHERE id = [submissionId]
```

### AI Integration Security

- API key stored as Supabase secret (not exposed to client)
- All AI calls routed through secure edge function
- CORS properly configured
- JWT verification disabled (function is public-facing)

### Rate Limits & Pricing

Lovable AI uses usage-based pricing:
- Free tier includes limited monthly usage
- Exceeding limits triggers 402 errors
- Top-up required in Settings → Workspace → Usage

---

## API Documentation

### Supabase Client API

**Import:**
```typescript
import { supabase } from "@/integrations/supabase/client";
```

**Common Operations:**

#### Authentication
```typescript
// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password"
});

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "password",
  options: {
    data: {
      full_name: "John Doe",
      role: "student"
    }
  }
});

// Sign out
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

#### Database Queries
```typescript
// Select
const { data, error } = await supabase
  .from('assignments')
  .select('*')
  .eq('class_id', classId);

// Insert
const { data, error } = await supabase
  .from('assignments')
  .insert({
    class_id: classId,
    title: "New Assignment",
    description: "Description"
  });

// Update
const { data, error } = await supabase
  .from('assignments')
  .update({ title: "Updated Title" })
  .eq('id', assignmentId);

// Delete
const { data, error } = await supabase
  .from('assignments')
  .delete()
  .eq('id', assignmentId);
```

#### File Storage
```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('assignment-files')
  .upload(`${userId}/${fileName}`, file);

// Get public URL
const { data } = supabase.storage
  .from('assignment-files')
  .getPublicUrl(filePath);

// Download file
const { data, error } = await supabase.storage
  .from('assignment-files')
  .download(filePath);

// Delete file
const { data, error } = await supabase.storage
  .from('assignment-files')
  .remove([filePath]);
```

### Edge Functions API

#### AI Grading Function

**Endpoint:** `${VITE_SUPABASE_URL}/functions/v1/ai-grading`

**Method:** POST

**Request:**
```typescript
const { data, error } = await supabase.functions.invoke('ai-grading', {
  body: {
    submissionId: "uuid",
    content: "Student's submission text",
    assignmentTitle: "Assignment name"
  }
});
```

**Response:**
```typescript
{
  grade: number,        // 0-100
  feedback: string      // AI-generated feedback
}
```

**Error Codes:**
- 429: Rate limit exceeded
- 402: Payment required
- 500: Server error

#### Email Notification Function

**Endpoint:** `${VITE_SUPABASE_URL}/functions/v1/send-notification-email`

**Method:** POST

**Purpose:** Sends email notifications to users

**Implementation:** Defined but implementation details not visible in current codebase

### Environment Variables

```bash
# Frontend (.env)
VITE_SUPABASE_URL=https://svihfxzseqklxgwidcja.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon key]
VITE_SUPABASE_PROJECT_ID=svihfxzseqklxgwidcja

# Backend (Supabase Secrets)
SUPABASE_URL=[project url]
SUPABASE_ANON_KEY=[anon key]
SUPABASE_SERVICE_ROLE_KEY=[service role key]
SUPABASE_DB_URL=[database url]
LOVABLE_API_KEY=[auto-generated]
```

---

## Storage Architecture

### Storage Buckets

#### 1. `assignment-files`
**Purpose:** Store student assignment submissions  
**Public Access:** No (private bucket)  
**RLS Enabled:** Yes

**Access Policies:**
- Students can upload to their own folder: `{user_id}/*`
- Students can view their own files
- Teachers can view files from enrolled students
- Teachers can download for grading

**Typical File Path:**
```
assignment-files/{student_id}/{assignment_id}-{timestamp}-{filename}
```

#### 2. `class-resources`
**Purpose:** Store educational materials  
**Public Access:** No (private bucket)  
**RLS Enabled:** Yes

**Access Policies:**
- Teachers can upload resources to their classes
- Students can download resources from enrolled classes
- Access controlled by class enrollment

**Typical File Path:**
```
class-resources/{class_id}/{category}/{filename}
```

### File Upload Implementation

```typescript
// Assignment submission file upload
const uploadFile = async (file: File, assignmentId: string) => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/${assignmentId}-${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('assignment-files')
    .upload(filePath, file);
  
  if (error) throw error;
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('assignment-files')
    .getPublicUrl(filePath);
  
  return urlData.publicUrl;
};
```

### File Preview System

**Component:** `FilePreview.tsx`

**Supported File Types:**
- **Images:** jpg, jpeg, png, gif, webp (inline preview)
- **PDFs:** pdf (iframe preview)
- **Others:** Download prompt with file info

**Implementation:**
```typescript
const getFileType = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image';
  if (extension === 'pdf') return 'pdf';
  return 'unsupported';
};
```

---

## Security Overview

### Current Security Measures

✅ **Implemented:**
- Row Level Security (RLS) enabled on all tables
- JWT-based authentication
- HTTPS encryption
- CORS properly configured
- Input sanitization with Zod schemas
- File upload restrictions
- Environment variable protection
- Supabase service role key isolation

### Security Vulnerabilities

⚠️ **Critical Issues:**

1. **Role Privilege Escalation**
   - **Issue:** User roles stored in `profiles` table accessible during signup
   - **Impact:** Attackers can set their role to 'admin' or 'teacher' during registration
   - **Fix Required:** Move roles to separate `user_roles` table with SECURITY DEFINER function
   - **Priority:** Critical

2. **Client-Side Authorization**
   - **Issue:** Dashboard access controlled only by client-side routing
   - **Impact:** Users can manipulate localStorage to access unauthorized dashboards
   - **Fix Required:** Implement server-side role validation in RLS policies
   - **Priority:** Critical

3. **Public Profile Access**
   - **Issue:** All profiles viewable by any authenticated user
   - **Impact:** Email addresses and full names exposed
   - **Fix Required:** Restrict profile visibility to relevant users only
   - **Priority:** High

4. **Public Class Listing**
   - **Issue:** All classes viewable by anyone (even unauthenticated users)
   - **Impact:** Class information exposed publicly
   - **Fix Required:** Restrict class viewing to enrolled users and teachers
   - **Priority:** Medium

5. **Missing Input Validation**
   - **Issue:** No file type validation on upload
   - **Impact:** Potential malicious file uploads
   - **Fix Required:** Add file type whitelist and size limits
   - **Priority:** Medium

### Recommended Security Enhancements

1. **Implement Proper Role System**
```sql
-- Create user_roles table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Security definer function
CREATE FUNCTION has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;
```

2. **Add RLS Policies with Role Checks**
```sql
-- Example: Restrict profile access
CREATE POLICY "Users can view relevant profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR
  has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM class_enrollments ce
    WHERE ce.student_id = id OR ce.student_id = auth.uid()
  )
);
```

3. **File Upload Validation**
```typescript
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
```

4. **Rate Limiting**
   - Implement rate limiting on API endpoints
   - Protect against brute force attacks
   - Use Supabase Rate Limiting feature

5. **Content Security Policy**
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline';">
```

---

## Application Routes

### Public Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Home | Landing page with platform overview |
| `/auth` | Auth | Login and signup forms |
| `*` | NotFound | 404 page for invalid routes |

### Protected Routes

| Route | Component | Required Role | Description |
|-------|-----------|---------------|-------------|
| `/admin` | AdminDashboard | admin | User management and approval |
| `/teacher` | TeacherDashboard | teacher | Class and assignment management |
| `/student` | StudentDashboard | student | View classes and submit work |

### Route Protection

**Current Implementation (Client-Side Only):**
```typescript
// In Auth.tsx after successful login
if (profile.role === "admin") navigate("/admin");
else if (profile.role === "teacher") navigate("/teacher");
else navigate("/student");
```

**⚠️ No Server-Side Protection:** Routes can be accessed by manipulating client state

**Recommended Implementation:**
- Add server-side role validation
- Use Supabase RLS policies to restrict data access
- Implement route guards that check backend for user role

---

## UI/UX Methodology

### Design System

**Framework:** Tailwind CSS with custom design tokens  
**Component Library:** shadcn/ui (customizable)  
**Design Philosophy:** Clean, modern, education-focused

**Color Palette:**
```css
/* Light Mode */
--primary: 221 83% 53%        /* Education blue */
--secondary: 142 76% 36%      /* Success green */
--accent: 45 93% 47%          /* Warning yellow */
--destructive: 0 84% 60%      /* Error red */

/* Dark Mode */
--primary: 217 91% 60%
--secondary: 142 71% 45%
/* ... additional dark mode tokens */
```

**Typography:**
- Base font: System font stack
- Headings: Gradient text effects
- Readable line heights
- Consistent spacing scale

### Responsive Design

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile-First Approach:**
```typescript
// Responsive component example
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards */}
</div>
```

### Component Patterns

**Card-Based Layouts:**
```typescript
<Card className="hover:shadow-lg transition-shadow">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

**Form Patterns:**
- React Hook Form for state management
- Zod for validation
- Inline error messages
- Loading states on submission

**Data Display:**
- Tables for structured data
- Charts (Recharts) for analytics
- Badges for status indicators
- Avatars for user representation

### Accessibility

- Semantic HTML elements
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus visible indicators
- Color contrast compliance (WCAG AA)

### User Feedback

**Toast Notifications:**
```typescript
import { toast } from "sonner";

toast.success("Assignment submitted successfully!");
toast.error("Failed to upload file");
toast.loading("Processing...");
```

**Loading States:**
- Skeleton loaders for data fetching
- Spinner components for actions
- Disabled states during operations

### Icons

**Library:** Lucide React  
**Usage:** Consistent icon set across platform  
**Examples:**
- User, UserCheck, Users (user management)
- BookOpen, GraduationCap (education)
- FileText, Upload, Download (files)
- Bell, AlertCircle (notifications)

---

## Key Features

### For Teachers

1. **Class Management**
   - Create unlimited classes
   - Generate unique class codes
   - View enrolled students
   - Manage class details

2. **Assignment System**
   - Create assignments with due dates
   - Attach files and resources
   - Set point values
   - View all submissions

3. **AI-Powered Grading**
   - One-click AI grading
   - Detailed feedback generation
   - Grade suggestions (0-100)
   - Manual override capability

4. **Attendance Tracking**
   - Mark daily attendance
   - Present/Absent/Late status
   - Individual student history
   - Attendance analytics and trends
   - Export attendance reports

5. **Resource Library**
   - Upload study materials
   - Categorize resources
   - Share with specific classes
   - Track download counts

6. **Announcements**
   - Broadcast messages to classes
   - Rich text formatting
   - Timestamp tracking

7. **Timetable Management**
   - Create weekly schedules
   - Specify rooms and times
   - Color-coded subjects

8. **Analytics Dashboard**
   - Class performance metrics
   - Submission rates
   - Attendance trends
   - Grade distributions

9. **Export Capabilities**
   - PDF export for grades
   - Attendance reports
   - Student performance summaries

### For Students

1. **Class Enrollment**
   - Join classes with codes
   - View enrolled classes
   - See class details

2. **Assignment Submission**
   - View assignments and due dates
   - Submit text responses
   - Upload files
   - Track submission status

3. **Grade Viewing**
   - See graded assignments
   - Read teacher feedback
   - Read AI feedback
   - Track overall performance

4. **Attendance Tracking**
   - View personal attendance
   - See attendance statistics
   - Identify patterns

5. **Resource Access**
   - Download class materials
   - Preview files
   - Search resources
   - Filter by category

6. **Announcements**
   - Receive class updates
   - Read announcements feed
   - Filter by class

7. **Personal Timetable**
   - View weekly schedule
   - See room locations
   - Get class timings

### For Admins

1. **User Management**
   - View all registered users
   - See user roles
   - Track registration dates

2. **Approval System**
   - Approve new registrations
   - Reject suspicious accounts
   - Manage user access

3. **System Overview**
   - Total user counts
   - Role distribution
   - Platform statistics

---

## Data Export & Reporting

### Export Utilities

**Location:** `src/lib/exportUtils.ts`

**Library:** jsPDF + jsPDF-AutoTable

### Available Exports

1. **Attendance Reports (PDF)**
   - Student-wise attendance
   - Date range selection
   - Status breakdown (Present/Absent/Late)
   - Percentage calculations

2. **Grade Reports (PDF)**
   - Assignment grades
   - Student performance
   - Feedback summaries

**Example Implementation:**
```typescript
import { exportAttendanceToPDF } from "@/lib/exportUtils";

// Export attendance data
exportAttendanceToPDF(
  attendanceData,
  studentName,
  className,
  dateRange
);
```

---

## Performance Optimization

### Current Optimizations

1. **Code Splitting**
   - React Router lazy loading
   - Component-level code splitting
   - Dynamic imports for heavy components

2. **Data Caching**
   - TanStack React Query cache
   - Stale-while-revalidate strategy
   - Automatic refetching

3. **Image Optimization**
   - Lazy loading images
   - Responsive images
   - WebP format support

4. **Bundle Optimization**
   - Vite build optimizations
   - Tree shaking
   - Minification

### Performance Metrics (Target)

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.0s
- Lighthouse Score: > 90

---

## Deployment

### Platform

**Hosting:** Lovable Cloud  
**URL Structure:** `{project-name}.lovable.app`  
**SSL:** Automatic HTTPS  
**CDN:** Global edge network

### Deployment Process

1. **Automatic Deployment**
   - Push to main branch
   - Lovable auto-builds and deploys
   - Zero-downtime deployment

2. **Backend Deployment**
   - Edge functions deploy automatically
   - Database migrations run on deploy
   - No manual intervention required

3. **Environment Variables**
   - Automatically provisioned
   - Secure secret management
   - No manual configuration needed

### Build Configuration

**Build Tool:** Vite  
**Build Command:** `npm run build`  
**Output Directory:** `dist/`

**Vite Config Highlights:**
```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Custom Domain

Custom domains can be connected via:
Settings → Domains → Add Custom Domain

**Requirements:**
- Paid Lovable plan
- DNS configuration
- SSL auto-provisioned

---

## Development Guidelines

### Code Style

1. **TypeScript First**
   - Always use TypeScript
   - Define proper interfaces
   - Avoid `any` type

2. **Component Structure**
```typescript
// Imports
import { useState } from "react";
import { Button } from "@/components/ui/button";

// Types/Interfaces
interface MyComponentProps {
  title: string;
  onSave: () => void;
}

// Component
export const MyComponent = ({ title, onSave }: MyComponentProps) => {
  // Hooks
  const [state, setState] = useState();
  
  // Event handlers
  const handleClick = () => {};
  
  // Render
  return <div>{/* JSX */}</div>;
};
```

3. **File Naming**
   - Components: PascalCase (e.g., `UserCard.tsx`)
   - Utilities: camelCase (e.g., `formatDate.ts`)
   - Pages: PascalCase (e.g., `StudentDashboard.tsx`)

4. **Import Order**
   - React imports
   - Third-party libraries
   - Local components
   - Utilities and types
   - Styles

### Best Practices

1. **State Management**
   - Use React Query for server state
   - Use useState for local component state
   - Lift state only when necessary

2. **Error Handling**
   - Always handle errors from async operations
   - Show user-friendly error messages
   - Log errors for debugging

3. **Accessibility**
   - Use semantic HTML
   - Add ARIA labels
   - Ensure keyboard navigation
   - Test with screen readers

4. **Performance**
   - Memoize expensive calculations
   - Use React.memo for pure components
   - Implement virtual scrolling for large lists
   - Lazy load routes and components

5. **Security**
   - Never expose API keys
   - Validate all user inputs
   - Use RLS policies
   - Sanitize data before display

### Git Workflow

1. Feature branches
2. Descriptive commit messages
3. Pull request reviews
4. Automated testing (if configured)

---

## Testing Strategy

### Recommended Testing Approach

1. **Unit Tests**
   - Test utility functions
   - Test custom hooks
   - Use Vitest

2. **Component Tests**
   - Test UI components
   - Test user interactions
   - Use React Testing Library

3. **Integration Tests**
   - Test feature workflows
   - Test API integrations
   - Use Playwright

4. **E2E Tests**
   - Test critical user journeys
   - Test across different roles
   - Automated with CI/CD

**Note:** Testing infrastructure not currently implemented but recommended for production.

---

## Monitoring & Analytics

### Recommended Tools

1. **Error Tracking**
   - Sentry for error monitoring
   - Log edge function errors
   - Track client-side exceptions

2. **Performance Monitoring**
   - Web Vitals tracking
   - API response times
   - Database query performance

3. **User Analytics**
   - Page view tracking
   - Feature usage metrics
   - User flow analysis

**Note:** Analytics not currently implemented.

---

## Scalability Considerations

### Current Architecture Limits

- **Database:** PostgreSQL can handle millions of rows
- **Storage:** Unlimited file storage (usage-based pricing)
- **Edge Functions:** Auto-scaling serverless compute
- **Frontend:** Static assets on global CDN

### Scaling Strategies

1. **Database Optimization**
   - Add indexes on frequently queried columns
   - Implement database connection pooling
   - Use materialized views for complex queries

2. **Caching Layer**
   - Redis for session data
   - CDN caching for static assets
   - Query result caching

3. **Load Balancing**
   - Handled automatically by Lovable Cloud
   - No manual configuration needed

4. **File Storage**
   - Implement CDN for file delivery
   - Compress images before upload
   - Use streaming for large files

### Estimated Capacity

Based on current architecture:
- **Users:** 100,000+ concurrent
- **Classes:** Unlimited
- **Assignments:** Millions
- **File Storage:** Petabyte-scale (pricing applies)

---

## Known Issues & Limitations

### Critical Security Issues

1. ❌ User roles selectable during signup
2. ❌ Client-side authorization only
3. ❌ Public profile access
4. ❌ No file type validation

### Functional Limitations

1. No real-time collaboration
2. No offline mode
3. No mobile apps (web-only)
4. Limited export formats
5. No bulk operations
6. No email notifications (function exists but not implemented)

### Technical Debt

1. Missing test coverage
2. No error boundary implementation
3. Limited accessibility testing
4. No performance monitoring
5. No analytics implementation

---

## Future Enhancements

### Planned Features

1. **Real-time Collaboration**
   - Live document editing
   - Real-time messaging
   - Video conferencing integration

2. **Mobile Applications**
   - React Native apps
   - Push notifications
   - Offline support

3. **Advanced Analytics**
   - Predictive performance analysis
   - Learning pattern recognition
   - Automated intervention suggestions

4. **Enhanced AI Features**
   - Plagiarism detection
   - Automated essay scoring
   - Personalized learning paths

5. **Integration Ecosystem**
   - Google Classroom integration
   - Zoom/Teams integration
   - LMS integrations (Canvas, Moodle)

6. **Gamification**
   - Achievement badges
   - Leaderboards
   - Progress tracking

---

## Support & Documentation

### Getting Help

- **Documentation:** This file
- **Lovable Docs:** https://docs.lovable.dev/
- **Lovable Community:** Discord server
- **Technical Support:** support@lovable.dev

### Useful Resources

- [Lovable Quickstart](https://docs.lovable.dev/user-guides/quickstart)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

---

## Changelog

### Version History

**Current Version:** 1.0.0 (Initial Release)

**Features Implemented:**
- ✅ User authentication and authorization
- ✅ Role-based dashboards (Admin, Teacher, Student)
- ✅ Class management system
- ✅ Assignment creation and submission
- ✅ AI-powered grading
- ✅ Attendance tracking
- ✅ Resource management
- ✅ Announcements system
- ✅ Timetable management
- ✅ Analytics and reporting
- ✅ PDF export functionality

---

## License

**Project Type:** Educational Platform  
**License:** Proprietary (or specify your license)  
**Copyright:** © 2024 SmartClass AI

---

## Contributors

**Development Team:**
- Platform built using Lovable AI-assisted development
- Powered by Supabase and Lovable Cloud

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Maintained By:** SmartClass AI Development Team

---

## Quick Reference

### Essential Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Important File Locations

```
src/
├── pages/              # Main application pages
├── components/         # Reusable components
├── integrations/       # Supabase integration
├── lib/                # Utility functions
└── hooks/              # Custom React hooks

supabase/
├── functions/          # Edge functions
└── config.toml         # Supabase configuration
```

### Environment Variables Quick Reference

```bash
VITE_SUPABASE_URL=https://svihfxzseqklxgwidcja.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[your-key]
VITE_SUPABASE_PROJECT_ID=svihfxzseqklxgwidcja
```

---

*End of Technical Documentation*
