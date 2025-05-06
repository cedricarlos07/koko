import axios from 'axios';
import { storage } from './storage';
import { zoomOAuthService } from './services/zoom-oauth-service';
import { systemSettingsService } from './services/system-settings-service';

// Vérifier si nous sommes en mode simulation
const isSimulationMode = async () => {
  return await systemSettingsService.isSimulationModeEnabled();
};

// Create a Zoom meeting
export const createZoomMeeting = async (
  topic: string,
  startTime: string | Date, // ISO format or Date object
  duration: number, // In minutes
  hostEmail: string = '',
  timezone: string = 'GMT'
) => {
  // Vérifier si nous sommes en mode simulation
  if (await isSimulationMode()) {
    const simulatedId = `simulated_${Date.now()}`;
    const simulatedUrl = `https://zoom.us/j/${simulatedId}`;

    // Log the simulated activity
    await storage.logActivity({
      userId: null,
      type: 'zoom_meeting_simulated',
      description: `Simulation de création de réunion Zoom: ${topic}`,
      metadata: JSON.stringify({
        meetingId: simulatedId,
        topic,
        startTime: typeof startTime === 'string' ? startTime : startTime.toISOString(),
        duration,
        hostEmail
      }),
      createdAt: Date.now()
    });

    return {
      meetingId: simulatedId,
      joinUrl: simulatedUrl,
      password: 'simulated',
      startUrl: simulatedUrl
    };
  }

  try {
    // Convertir startTime en ISO string si c'est un objet Date
    const startTimeISO = typeof startTime === 'string' ? startTime : startTime.toISOString();

    // Créer la réunion via le service OAuth
    const meetingData = await zoomOAuthService.request(
      'POST',
      `/users/${hostEmail ? `email:${hostEmail}` : 'me'}/meetings`,
      {
        topic,
        type: 2, // Scheduled meeting
        start_time: startTimeISO,
        duration,
        timezone,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: true,
          auto_recording: 'none',
          waiting_room: false
        }
      }
    );

    // Log the activity
    await storage.logActivity({
      userId: null,
      type: 'zoom_meeting_created',
      description: `Zoom meeting created: ${topic}`,
      metadata: JSON.stringify({
        meetingId: meetingData.id,
        topic,
        startTime: startTimeISO,
        duration,
        hostEmail
      }),
      createdAt: Date.now()
    });

    return {
      meetingId: meetingData.id,
      joinUrl: meetingData.join_url,
      password: meetingData.password,
      startUrl: meetingData.start_url
    };
  } catch (error) {
    console.error('Error creating Zoom meeting:', error.response?.data || error.message);

    // Log the error
    await storage.logActivity({
      userId: null,
      type: 'zoom_meeting_error',
      description: `Error creating Zoom meeting: ${topic}`,
      metadata: JSON.stringify({
        error: error.response?.data || error.message,
        topic,
        startTime: typeof startTime === 'string' ? startTime : startTime.toISOString(),
        duration,
        hostEmail
      }),
      createdAt: Date.now()
    });

    return null;
  }
};

// Get Zoom meeting details
export const getZoomMeeting = async (meetingId: string) => {
  // Vérifier si nous sommes en mode simulation
  if (await isSimulationMode()) {
    // Simuler les détails d'une réunion
    if (meetingId.startsWith('simulated_')) {
      return {
        id: meetingId,
        topic: 'Simulated Meeting',
        start_time: new Date().toISOString(),
        duration: 60,
        join_url: `https://zoom.us/j/${meetingId}`,
        password: 'simulated',
        status: 'waiting'
      };
    }
  }

  try {
    // Obtenir les détails de la réunion via le service OAuth
    const meetingData = await zoomOAuthService.request(
      'GET',
      `/meetings/${meetingId}`
    );

    return meetingData;
  } catch (error) {
    console.error(`Error getting Zoom meeting ${meetingId}:`, error.response?.data || error.message);
    return null;
  }
};

// Get Zoom meeting participants
export const getZoomMeetingParticipants = async (meetingId: string) => {
  // Vérifier si nous sommes en mode simulation
  if (await isSimulationMode()) {
    // Simuler les participants d'une réunion
    if (meetingId.startsWith('simulated_')) {
      return [
        {
          id: 'simulated_participant_1',
          name: 'John Doe',
          user_email: 'john.doe@example.com',
          join_time: new Date(Date.now() - 3600000).toISOString(),
          leave_time: new Date().toISOString(),
          duration: 60
        },
        {
          id: 'simulated_participant_2',
          name: 'Jane Smith',
          user_email: 'jane.smith@example.com',
          join_time: new Date(Date.now() - 3000000).toISOString(),
          leave_time: new Date().toISOString(),
          duration: 50
        }
      ];
    }
  }

  try {
    // Obtenir les participants via le service OAuth
    const participantsData = await zoomOAuthService.request(
      'GET',
      `/metrics/meetings/${meetingId}/participants`
    );

    return participantsData.participants || [];
  } catch (error) {
    console.error(`Error getting participants for meeting ${meetingId}:`, error.response?.data || error.message);
    return [];
  }
};

// Mark attendance based on Zoom participants
export const markAttendanceFromZoom = async (sessionId: number, meetingId: string) => {
  try {
    // Get session details
    const session = await storage.getSession(sessionId);
    if (!session) {
      console.error(`Session ${sessionId} not found`);
      return false;
    }

    // Get participants from Zoom
    const participants = await getZoomMeetingParticipants(meetingId);
    if (!participants || participants.length === 0) {
      console.warn(`No participants found for Zoom meeting ${meetingId}`);
      return false;
    }

    // Get course details to find students
    const course = await storage.getCourse(session.courseId);
    if (!course) {
      console.error(`Course ${session.courseId} not found`);
      return false;
    }

    // Log the attendance check
    await storage.logActivity({
      userId: null,
      type: 'zoom_attendance_check',
      description: `Checking attendance for session ${sessionId} (meeting ${meetingId})`,
      metadata: JSON.stringify({
        sessionId,
        meetingId,
        participantCount: participants.length
      }),
      createdAt: Date.now()
    });

    // Get all users
    const allUsers = await storage.listUsers();
    const students = allUsers.filter(user => user.role === 'student');

    // Process each participant
    for (const participant of participants) {
      // Try to match participant name with a student
      const matchedStudent = students.find(student => {
        const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
        const participantName = participant.name.toLowerCase();
        return fullName.includes(participantName) || participantName.includes(fullName);
      });

      if (matchedStudent) {
        // Calculate duration in minutes
        const joinTime = new Date(participant.join_time).getTime();
        const leaveTime = participant.leave_time
          ? new Date(participant.leave_time).getTime()
          : Date.now();
        const durationMinutes = Math.round((leaveTime - joinTime) / (1000 * 60));

        // Mark attendance
        await storage.createAttendance({
          sessionId,
          userId: matchedStudent.id,
          joinTime,
          leaveTime,
          duration: durationMinutes,
          present: durationMinutes >= 10 ? 1 : 0, // Mark present if attended at least 10 minutes
          createdAt: Date.now()
        });

        // Award points for attendance (10 points for present)
        if (durationMinutes >= 10) {
          await storage.updateUser(matchedStudent.id, {
            points: (matchedStudent.points || 0) + 10
          });

          // Log the activity
          await storage.logActivity({
            userId: matchedStudent.id,
            type: 'zoom_attendance',
            description: `User attended Zoom session for ${durationMinutes} minutes`,
            metadata: JSON.stringify({
              sessionId,
              meetingId,
              durationMinutes,
              joinTime,
              leaveTime
            }),
            createdAt: Date.now()
          });
        }
      }
    }

    return true;
  } catch (error) {
    console.error(`Error marking attendance from Zoom for session ${sessionId}:`, error);
    return false;
  }
};
