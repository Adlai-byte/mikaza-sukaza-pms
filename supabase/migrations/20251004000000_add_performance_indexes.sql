-- Migration: Add Performance Indexes for Property Management
-- Created: 2025-10-04
-- Purpose: Improve query performance for frequently filtered and joined columns

-- Add indexes on properties table for common filter operations
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_is_booking ON properties(is_booking);
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

-- Add composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_properties_active_type ON properties(is_active, property_type);
CREATE INDEX IF NOT EXISTS idx_properties_booking_active ON properties(is_booking, is_active);

-- Add indexes on property_location for city and address searches
CREATE INDEX IF NOT EXISTS idx_property_location_city ON property_location(city);
CREATE INDEX IF NOT EXISTS idx_property_location_property_id ON property_location(property_id);

-- Add indexes on property_images for faster image lookups
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_is_primary ON property_images(property_id, is_primary) WHERE is_primary = true;

-- Add indexes on related tables for join performance
CREATE INDEX IF NOT EXISTS idx_property_communication_property_id ON property_communication(property_id);
CREATE INDEX IF NOT EXISTS idx_property_access_property_id ON property_access(property_id);
CREATE INDEX IF NOT EXISTS idx_property_extras_property_id ON property_extras(property_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);

-- Add indexes on junction tables for many-to-many relationships
CREATE INDEX IF NOT EXISTS idx_property_amenities_property_id ON property_amenities(property_id);
CREATE INDEX IF NOT EXISTS idx_property_amenities_amenity_id ON property_amenities(amenity_id);
CREATE INDEX IF NOT EXISTS idx_property_rules_property_id ON property_rules(property_id);
CREATE INDEX IF NOT EXISTS idx_property_rules_rule_id ON property_rules(rule_id);

-- Add index on users table for owner lookups
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

-- Add partial indexes for frequently accessed subsets
CREATE INDEX IF NOT EXISTS idx_properties_active_only ON properties(property_id, property_name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_properties_booking_available ON properties(property_id, property_name) WHERE is_booking = true AND is_active = true;

-- Add text search indexes for better search performance (if using PostgreSQL full-text search)
-- Uncomment these if you want to enable full-text search capabilities
-- CREATE INDEX IF NOT EXISTS idx_properties_name_search ON properties USING gin(to_tsvector('english', property_name));
-- CREATE INDEX IF NOT EXISTS idx_property_location_search ON property_location USING gin(to_tsvector('english', address || ' ' || city));

-- Performance note: These indexes will improve read performance but may slightly slow down writes.
-- Monitor your database performance and adjust as needed.
