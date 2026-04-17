/**
 * Format a date/time string to Toronto timezone (America/Toronto)
 * @param dateString ISO date string from the server
 * @returns Formatted date string in Toronto timezone
 */
export const formatDateToTorontoTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'TBA';
  
  try {
    const date = new Date(dateString);
    
    // Format using Toronto timezone (Eastern Time)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    
    return formatter.format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format a date/time for display with timezone indicator
 * @param dateString ISO date string from the server
 * @returns Formatted date string with EST/EDT indicator
 */
export const formatDateWithTZ = (dateString: string | null | undefined): string => {
  if (!dateString) return 'TBA';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    // Format the date/time in Toronto timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const dateStr = formatter.format(date);
    
    // Get timezone abbreviation
    const tzOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Toronto',
      timeZoneName: 'short',
    };
    
    const tzFormatter = new Intl.DateTimeFormat('en-US', tzOptions);
    const tzStr = tzFormatter.format(date);
    
    // Extract timezone from formatted string (it's the last part after space)
    const parts = tzStr.split(' ');
    const tzName = parts[parts.length - 1] || 'EST';
    
    // Return formatted: "04/13/2026, 02:30 PM EST"
    return `${dateStr} ${tzName}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};
