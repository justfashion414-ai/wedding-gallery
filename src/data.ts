import { CommunityZone, Announcement, GalleryImage, MapLocation } from './types';

export const ESTATE_DETAILS = {
  name: "Ire-Akari Estate",
  tagline: "Serene Environments. Good Security. Twenty Four Hours Electricity.",
  location: "Soka, Ibadan, Nigeria",
  founded: "1996",
  presidentName: "Alhaji Kazeem Alarape",
  presidentTitle: "President, Ire-Akari Estate Residents Association",
  presidentWelcome: "Welcome to Ire-Akari Estate, a premier sanctuary located in Soka, Ibadan. Here, modern development meets absolute tranquility. Our estate is renowned for its serene environments, twenty four hours electricity, and robust multi-tier security. We take great pride in our peaceful coexistence and the high return on investment on our premium properties. Whether you are a business owner thriving in our commercial hubs, a landlord, or a resident, we welcome you home to a connected and prosperous future.",
  presidentSignature: "Kazeem Alarape",
};

export const COMMUNITIES: CommunityZone[] = [
  {
    id: "zone-one",
    name: "Zone One",
    alias: "Pace Setter Zone",
    iconName: "ShieldAlert",
    description: "The primary secure entryway hub. Features Broad Street, Palm Boulevard, and prime commercial blocks with thriving businesses."
  },
  {
    id: "zone-two",
    name: "Zone Two",
    alias: "Unity & Peace Zone",
    iconName: "Trees",
    description: "The botanical heartland. Comprises Royal Crest Lane, Orchard Drive, and lush park layers with serene environments."
  },
  {
    id: "zone-three",
    name: "Zone Three",
    alias: "Parakoyi/Oloya Zone",
    iconName: "Zap",
    description: "The tech & energy nexus. Contains Solar Avenue, Coexistence Boulevard, and premium blocks enjoying twenty four hours electricity."
  },
  {
    id: "zone-four",
    name: "Zone Four",
    alias: "Ogun/Osun/NUT Zone",
    iconName: "TrendingUp",
    description: "The premium residential layer. Home to Horizon View, Sunset Heights, and properties offering high return on investment."
  }
];

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "notice-1",
    title: "Annual General Assembly 2026",
    category: "meeting",
    date: "July 28, 2026",
    content: "Our annual meeting is scheduled at the Zone One Town Hall. Agenda includes security upgrades across all zones and power grid maintenance to ensure twenty four hours electricity.",
    urgency: "high"
  },
  {
    id: "notice-2",
    title: "Zone Four Property Appraisals",
    category: "general",
    date: "July 24, 2026",
    content: "Property values in Zone Four have increased by 28%, proving our high return on investment. Free valuation services are open this week.",
    urgency: "medium"
  },
  {
    id: "notice-3",
    title: "Smart Waste Sorting in Zone Two",
    category: "maintenance",
    date: "July 19, 2026",
    content: "We have deployed smart garbage separation bins across Orchard Drive in Zone Two. Help maintain our serene environments.",
    urgency: "low"
  },
  {
    id: "notice-4",
    title: "RFID Gate testing at Main Entrance",
    category: "emergency",
    date: "July 17, 2026",
    content: "Routine testing of automated license-plate recognition systems at the main gate. Expect minor delays as we maintain good security.",
    urgency: "high"
  }
];

export const GALLERY_IMAGES: GalleryImage[] = [
  {
    id: "gal-1",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    caption: "The Grand Pavilion and Swimming Pool in Zone Two",
    category: "architecture"
  },
  {
    id: "gal-2",
    url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
    caption: "Premium Contemporary Estate Residence at Sunset",
    category: "architecture"
  },
  {
    id: "gal-3",
    url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    caption: "Quiet Tree-Lined Residential Boulevard in Zone Three",
    category: "infrastructure"
  },
  {
    id: "gal-4",
    url: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1200&q=80",
    caption: "Healthy Outdoor Living and Community Culture",
    category: "lifestyle"
  },
  {
    id: "gal-5",
    url: "https://images.unsplash.com/photo-1558904541-efa8c3a30fc9?auto=format&fit=crop&w=1200&q=80",
    caption: "Serene Jogging Trails and Botanical Flora",
    category: "nature"
  },
  {
    id: "gal-6",
    url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    caption: "Modern Living Rooms Intersecting Luxury and Space",
    category: "architecture"
  },
  {
    id: "gal-7",
    url: "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?auto=format&fit=crop&w=1200&q=80",
    caption: "Stately Monitored Estate Entrance Gatehouse",
    category: "infrastructure"
  },
  {
    id: "gal-8",
    url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1200&q=80",
    caption: "Lush Greenery and Shaded Picnic Enclaves in Zone One",
    category: "nature"
  },
  {
    id: "gal-9",
    url: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80",
    caption: "Premium Interior Craftsmanship of Townhouses",
    category: "architecture"
  },
  {
    id: "gal-10",
    url: "https://images.unsplash.com/photo-1473116763269-255ea742f5f6?auto=format&fit=crop&w=1200&q=80",
    caption: "Scenic Waterfront Vista and Recreational Space",
    category: "nature"
  },
  {
    id: "gal-11",
    url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80",
    caption: "Fostering Warm Peaceful Coexistence",
    category: "lifestyle"
  },
  {
    id: "gal-12",
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
    caption: "State-of-the-Art Executive Coworking Hub",
    category: "lifestyle"
  },
  {
    id: "gal-13",
    url: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1200&q=80",
    caption: "Modern Luxury Duplex in Zone Four",
    category: "architecture"
  },
  {
    id: "gal-14",
    url: "https://images.unsplash.com/photo-1592595896551-12b371d546d5?auto=format&fit=crop&w=1200&q=80",
    caption: "Sustainable Solar Installation providing 24h electricity",
    category: "infrastructure"
  },
  {
    id: "gal-15",
    url: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80",
    caption: "Lush Parklands and Quiet Reading Spaces",
    category: "nature"
  },
  {
    id: "gal-16",
    url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
    caption: "Fitness and Recreation Courts in Zone Three",
    category: "lifestyle"
  },
  {
    id: "gal-17",
    url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    caption: "Stately Villa with Beautiful Front Landscaping",
    category: "architecture"
  },
  {
    id: "gal-18",
    url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
    caption: "Modern Secure Gatehouse & Perimeter Fencing",
    category: "infrastructure"
  },
  {
    id: "gal-19",
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80",
    caption: "Soka Area Forest Reserve Canopy Walks",
    category: "nature"
  },
  {
    id: "gal-20",
    url: "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=1200&q=80",
    caption: "Community Children Playground and Picnic Grounds",
    category: "lifestyle"
  }
];

export const MAP_LOCATIONS: MapLocation[] = [
  {
    id: "loc-gate",
    name: "Main Security Gate",
    type: "gate",
    coordinates: { x: 15, y: 85 },
    description: "Fully guarded 24/7 main entrance equipped with biometric scanning, automated RFID, and ANPR plate recognition."
  },
  {
    id: "loc-club",
    name: "Grand Clubhouse & Pavilion",
    type: "clubhouse",
    coordinates: { x: 50, y: 45 },
    description: "Featuring a heated pool, luxury event halls, private lounges, and co-working workspace."
  },
  {
    id: "loc-park",
    name: "The Oasis Central Park",
    type: "park",
    coordinates: { x: 70, y: 35 },
    description: "Acres of pristine landscaped botanic gardens, dynamic water fountains, children's park, and running loop."
  },
  {
    id: "loc-chapel",
    name: "Crest Ecumenical Chapel",
    type: "church",
    coordinates: { x: 30, y: 30 },
    description: "A gorgeous, modern non-denominational chapel for family services and peaceful contemplation."
  },
  {
    id: "loc-mosque",
    name: "Crest Islamic Center & Mosque",
    type: "mosque",
    coordinates: { x: 45, y: 15 },
    description: "Elegant, peaceful architectural mosque offering congregational prayers and educational seminars."
  },
  {
    id: "loc-shop",
    name: "Plaza Avenue Mall",
    type: "shopping",
    coordinates: { x: 80, y: 70 },
    description: "Premium grocery, specialty cafes, pharmacy, and essential boutique retail strictly serving our community."
  },
  {
    id: "loc-emergency",
    name: "Emergency Clinic & Fire Station",
    type: "emergency",
    coordinates: { x: 25, y: 60 },
    description: "Dedicated emergency response center with 24/7 paramedics, doctors, and professional response vehicles."
  },
  {
    id: "loc-sports",
    name: "Athletic Arena & Courts",
    type: "facility",
    coordinates: { x: 60, y: 75 },
    description: "Lawn tennis courts, basketball arena, mini football turf, and highly-equipped outdoor gym."
  }
];
