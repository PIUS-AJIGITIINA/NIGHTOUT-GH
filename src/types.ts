export type Category = 'Concert' | 'Party' | 'Campus' | 'Comedy' | 'Festival' | 'Other';

export interface EventItem {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  category: string;
  price: string;
  description: string;
  sourceLink?: string;
  sourcePlatform: string;
  coverImage?: string;
  isPromoted?: boolean;
  isCommunitySubmitted?: boolean;
}
