export interface CommunityZone {
  id: string;
  name: string;
  alias?: string;
  iconName: string;
  description: string;
}

export interface Announcement {
  id: string;
  title: string;
  category: 'general' | 'meeting' | 'maintenance' | 'emergency';
  date: string;
  content: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface GalleryImage {
  id: string;
  url: string;
  caption: string;
  category: 'architecture' | 'lifestyle' | 'infrastructure' | 'nature';
}

export interface MapLocation {
  id: string;
  name: string;
  type: 'gate' | 'clubhouse' | 'park' | 'mosque' | 'church' | 'shopping' | 'emergency' | 'facility';
  coordinates: { x: number; y: number }; // Percentage offsets for SVG mapping
  description: string;
}

export type LoginType = 'resident' | 'landlord' | 'admin';
