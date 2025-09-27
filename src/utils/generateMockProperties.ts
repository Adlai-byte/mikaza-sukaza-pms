import { supabase } from "@/integrations/supabase/client";

const propertyTypes = [
  "Apartment", "House", "Condo", "Townhouse", "Studio", "Duplex", 
  "Villa", "Penthouse", "Loft", "Ranch", "Cottage", "Bungalow"
];

const cities = [
  "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia",
  "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville",
  "Fort Worth", "Columbus", "Charlotte", "San Francisco", "Indianapolis",
  "Seattle", "Denver", "Washington", "Boston", "Nashville", "Baltimore",
  "Oklahoma City", "Louisville", "Portland", "Las Vegas", "Milwaukee",
  "Albuquerque", "Tucson", "Fresno", "Mesa", "Kansas City", "Atlanta",
  "Long Beach", "Colorado Springs", "Raleigh", "Miami", "Virginia Beach",
  "Omaha", "Oakland", "Minneapolis", "Tulsa", "Arlington", "Tampa"
];

const states = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const amenities = [
  "Pool", "Gym", "Parking", "Wi-Fi", "Air Conditioning", "Heating",
  "Kitchen", "Laundry", "Balcony", "Garden", "Pet Friendly", "Security",
  "Elevator", "Fireplace", "Hot Tub", "Tennis Court", "BBQ Area"
];

const rules = [
  "No Smoking", "No Pets", "No Parties", "Quiet Hours", "Maximum Occupancy",
  "Check-in/Check-out Times", "Guest Policy", "Parking Rules", "Cleaning Fee",
  "Damage Deposit", "Age Restriction", "ID Required"
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomBoolean(): boolean {
  return Math.random() > 0.5;
}

export async function generateMockProperties(count: number = 100) {
  try {
    // First, get existing users, amenities, and rules
    const { data: users } = await supabase.from('users').select('user_id');
    const { data: amenitiesData } = await supabase.from('amenities').select('amenity_id');
    const { data: rulesData } = await supabase.from('rules').select('rule_id');

    if (!users || users.length === 0) {
      throw new Error('No users found. Please create users first.');
    }

    const properties = [];
    
    for (let i = 0; i < count; i++) {
      const city = getRandomElement(cities);
      const state = getRandomElement(states);
      const propertyType = getRandomElement(propertyTypes);
      const numBedrooms = getRandomNumber(1, 5);
      const numBathrooms = getRandomNumber(1, 3);
      
      // Create property data
      const propertyData = {
        owner_id: getRandomElement(users).user_id,
        property_type: propertyType,
        is_active: getRandomBoolean(),
        is_booking: getRandomBoolean(),
        is_pets_allowed: getRandomBoolean(),
        size_sqf: getRandomNumber(500, 3000),
        capacity: getRandomNumber(2, 8),
        max_capacity: getRandomNumber(8, 12),
        num_bedrooms: numBedrooms,
        num_bathrooms: numBathrooms,
        num_half_bath: getRandomBoolean() ? getRandomNumber(0, 2) : 0,
        num_wcs: getRandomNumber(0, 2),
        num_kitchens: getRandomNumber(1, 2),
        num_living_rooms: getRandomNumber(1, 2),
        
        // Location data
        location: {
          address: `${getRandomNumber(100, 9999)} ${getRandomElement(['Main', 'Oak', 'First', 'Second', 'Park', 'Washington', 'Maple', 'Cedar', 'Elm', 'View'])} ${getRandomElement(['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Rd', 'Way', 'Pl'])}`,
          city: city,
          state: state,
          postal_code: getRandomNumber(10000, 99999).toString(),
          latitude: (Math.random() * 180 - 90).toFixed(6),
          longitude: (Math.random() * 360 - 180).toFixed(6)
        },
        
        // Communication data
        communication: {
          phone_number: `+1${getRandomNumber(1000000000, 9999999999)}`,
          wifi_name: `${propertyType}_WiFi_${getRandomNumber(100, 999)}`,
          wifi_password: `password${getRandomNumber(100, 999)}`
        },
        
        // Access data
        access: {
          gate_code: getRandomNumber(1000, 9999).toString(),
          door_lock_password: getRandomNumber(100000, 999999).toString(),
          alarm_passcode: getRandomNumber(1000, 9999).toString()
        },
        
        // Extras data
        extras: {
          storage_number: getRandomBoolean() ? `S${getRandomNumber(100, 999)}` : null,
          storage_code: getRandomBoolean() ? getRandomNumber(1000, 9999).toString() : null,
          garage_number: getRandomBoolean() ? `G${getRandomNumber(10, 99)}` : null,
          mailing_box: getRandomBoolean() ? `MB${getRandomNumber(100, 999)}` : null,
          front_desk: getRandomBoolean() ? `Level ${getRandomNumber(1, 5)}` : null,
          pool_access_code: getRandomBoolean() ? getRandomNumber(1000, 9999).toString() : null
        },
        
        // Units data
        units: Array.from({ length: getRandomNumber(1, 3) }, (_, index) => ({
          property_name: `Unit ${index + 1}`,
          license_number: `LIC${getRandomNumber(100000, 999999)}`,
          folio: `F${getRandomNumber(10000, 99999)}`
        })),
        
        // Random amenities and rules
        amenity_ids: amenitiesData ? 
          Array.from({ length: getRandomNumber(2, 5) }, () => getRandomElement(amenitiesData).amenity_id) : [],
        rule_ids: rulesData ? 
          Array.from({ length: getRandomNumber(2, 4) }, () => getRandomElement(rulesData).rule_id) : [],
          
        // Mock image data
        images: [{
          url: `https://picsum.photos/800/600?random=${i + 1}`,
          title: `${propertyType} Profile Photo`,
          is_primary: true
        }]
      };
      
      properties.push(propertyData);
    }

    // Insert properties in batches to avoid overwhelming the database
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      const batchPromises = batch.map(async (propertyData) => {
        try {
          // We'll use the createProperty function from useProperties hook
          // For now, let's just insert the main property data
          const { data: property, error } = await supabase
            .from('properties')
            .insert([{
              owner_id: propertyData.owner_id,
              property_type: propertyData.property_type,
              is_active: propertyData.is_active,
              is_booking: propertyData.is_booking,
              is_pets_allowed: propertyData.is_pets_allowed,
              size_sqf: propertyData.size_sqf,
              capacity: propertyData.capacity,
              max_capacity: propertyData.max_capacity,
              num_bedrooms: propertyData.num_bedrooms,
              num_bathrooms: propertyData.num_bathrooms,
              num_half_bath: propertyData.num_half_bath,
              num_wcs: propertyData.num_wcs,
              num_kitchens: propertyData.num_kitchens,
              num_living_rooms: propertyData.num_living_rooms
            }])
            .select()
            .single();

          if (error) throw error;

          const propertyId = property.property_id;

          // Insert related data
          await Promise.all([
            // Location
            supabase.from('property_location').insert([{
              ...propertyData.location,
              property_id: propertyId
            }]),
            
            // Communication
            supabase.from('property_communication').insert([{
              ...propertyData.communication,
              property_id: propertyId
            }]),
            
            // Access
            supabase.from('property_access').insert([{
              ...propertyData.access,
              property_id: propertyId
            }]),
            
            // Extras
            supabase.from('property_extras').insert([{
              ...propertyData.extras,
              property_id: propertyId
            }]),
            
            // Units
            supabase.from('units').insert(
              propertyData.units.map(unit => ({
                ...unit,
                property_id: propertyId
              }))
            ),
            
            // Images
            supabase.from('property_images').insert(
              propertyData.images.map(image => ({
                property_id: propertyId,
                image_url: image.url,
                image_title: image.title,
                is_primary: image.is_primary
              }))
            ),
            
            // Amenities
            propertyData.amenity_ids.length > 0 && supabase.from('property_amenities').insert(
              propertyData.amenity_ids.map(amenity_id => ({
                property_id: propertyId,
                amenity_id
              }))
            ),
            
            // Rules
            propertyData.rule_ids.length > 0 && supabase.from('property_rules').insert(
              propertyData.rule_ids.map(rule_id => ({
                property_id: propertyId,
                rule_id
              }))
            )
          ]);

          return property;
        } catch (error) {
          console.error('Error creating property:', error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean));
      
      console.log(`Created batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(properties.length / batchSize)}`);
    }

    console.log(`Successfully created ${results.length} mock properties`);
    return results;
    
  } catch (error) {
    console.error('Error generating mock properties:', error);
    throw error;
  }
}