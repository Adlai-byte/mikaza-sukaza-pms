#!/usr/bin/env python3
import re

# Read the file
file_path = r"C:\Users\THEJORJ\Desktop\mikaza-sukaza-pms\src\components\PropertyManagement\PropertyForm.tsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define replacements (text_to_replace: translation_key)
replacements = {
    r'<h3 className="text-lg font-semibold mb-2">Property Details</h3>':
        r'<h3 className="text-lg font-semibold mb-2">{t(\'propertyForm.propertyDetails\')}</h3>',

    r'<p className="text-sm text-muted-foreground mb-4">Size, capacity, and room specifications</p>':
        r'<p className="text-sm text-muted-foreground mb-4">{t(\'propertyForm.propertyDetailsDesc\')}</p>',

    r'<FormLabel>Size \(sq ft\)</FormLabel>':
        r'<FormLabel>{t(\'propertyForm.sizeSqft\')}</FormLabel>',

    r'<FormLabel>Capacity</FormLabel>':
        r'<FormLabel>{t(\'propertyForm.capacity\')}</FormLabel>',

    r'<FormLabel>Max Capacity</FormLabel>':
        r'<FormLabel>{t(\'propertyForm.maxCapacity\')}</FormLabel>',

    r'<FormLabel>Bedrooms</FormLabel>':
        r'<FormLabel>{t(\'propertyForm.bedrooms\')}</FormLabel>',

    r'<FormLabel>Bathrooms</FormLabel>':
        r'<FormLabel>{t(\'propertyForm.bathrooms\')}</FormLabel>',

    r'<FormLabel>Half Baths</FormLabel>':
        r'<FormLabel>{t(\'propertyForm.halfBaths\')}</FormLabel>',

    r'<FormLabel>WCs</FormLabel>':
        r'<FormLabel>{t(\'propertyForm.wcs\')}</FormLabel>',

    r'<FormLabel>Kitchens</FormLabel>':
        r'<FormLabel>{t(\'propertyForm.kitchens\')}</FormLabel>',

    r'<FormLabel>Living Rooms</FormLabel>':
        r'<FormLabel>{t(\'propertyForm.livingRooms\')}</FormLabel>',

    r'<h4 className="text-md font-semibold mb-2">Property Units</h4>':
        r'<h4 className="text-md font-semibold mb-2">{t(\'propertyForm.propertyUnits\')}</h4>',

    r'<p className="text-sm text-muted-foreground mb-4">Manage individual units within this property \(optional\)</p>':
        r'<p className="text-sm text-muted-foreground mb-4">{t(\'propertyForm.propertyUnitsDesc\')}</p>',

    r'<p className="text-sm font-medium">\{units\.length\} \{units\.length === 1 \? \'unit\' : \'units\'\} configured</p>':
        r'<p className="text-sm font-medium">{t(\'propertyForm.unitsConfigured\', { count: units.length })}</p>',

    r'Add Unit\s*</Button>':
        r'{t(\'propertyForm.addUnit\')}\n                      </Button>',

    r'placeholder="Property name"':
        r'placeholder={t(\'propertyForm.propertyNamePlaceholderUnit\')}',

    r'placeholder="License number"':
        r'placeholder={t(\'propertyForm.licenseNumberPlaceholder\')}',

    r'placeholder="Folio"':
        r'placeholder={t(\'propertyForm.folioPlaceholder\')}',

    r'<h3 className="text-lg font-semibold mb-2">Communication Details</h3>':
        r'<h3 className="text-lg font-semibold mb-2">{t(\'propertyForm.communicationDetails\')}</h3>',

    r'<p className="text-sm text-muted-foreground mb-4">Contact information and internet access details for this property</p>':
        r'<p className="text-sm text-muted-foreground mb-4">{t(\'propertyForm.communicationDetailsDesc\')}</p>',

    r'<span>Contact Information</span>':
        r'<span>{t(\'propertyForm.contactInformation\')}</span>',

    r'<label className="text-sm font-medium text-gray-700">Phone Number</label>':
        r'<label className="text-sm font-medium text-gray-700">{t(\'propertyForm.phoneNumber\')}</label>',

    r'placeholder="\+1 \(555\) 123-4567"':
        r'placeholder={t(\'propertyForm.phoneNumberPlaceholder\')}',

    r'<label className="text-sm font-medium text-gray-700">WiFi Network Name</label>':
        r'<label className="text-sm font-medium text-gray-700">{t(\'propertyForm.wifiNetworkName\')}</label>',

    r'placeholder="MyPropertyWiFi"':
        r'placeholder={t(\'propertyForm.wifiNamePlaceholder\')}',

    r'<label className="text-sm font-medium text-gray-700">WiFi Password</label>':
        r'<label className="text-sm font-medium text-gray-700">{t(\'propertyForm.wifiPassword\')}</label>',

    r'placeholder="Enter WiFi password"':
        r'placeholder={t(\'propertyForm.wifiPasswordPlaceholder\')}',

    r'<h3 className="text-lg font-semibold mb-2">Access Information</h3>':
        r'<h3 className="text-lg font-semibold mb-2">{t(\'propertyForm.accessInformation\')}</h3>',

    r'<p className="text-sm text-muted-foreground mb-4">Security codes and entry information for property access</p>':
        r'<p className="text-sm text-muted-foreground mb-4">{t(\'propertyForm.accessInformationDesc\')}</p>',

    r'<span>Security Access</span>':
        r'<span>{t(\'propertyForm.securityAccess\')}</span>',

    r'<label className="text-sm font-medium text-gray-700">Gate Code</label>':
        r'<label className="text-sm font-medium text-gray-700">{t(\'propertyForm.gateCode\')}</label>',

    r'placeholder="1234#"':
        r'placeholder={t(\'propertyForm.gateCodePlaceholder\')}',

    r'<label className="text-sm font-medium text-gray-700">Door Lock Password</label>':
        r'<label className="text-sm font-medium text-gray-700">{t(\'propertyForm.doorLockPassword\')}</label>',

    r'placeholder="Enter lock code"':
        r'placeholder={t(\'propertyForm.doorLockPasswordPlaceholder\')}',

    r'<label className="text-sm font-medium text-gray-700">Alarm Passcode</label>':
        r'<label className="text-sm font-medium text-gray-700">{t(\'propertyForm.alarmPasscode\')}</label>',

    r'placeholder="Security alarm code"':
        r'placeholder={t(\'propertyForm.alarmPasscodePlaceholder\')}',

    r'<span>Additional Property Features</span>':
        r'<span>{t(\'propertyForm.additionalPropertyFeatures\')}</span>',

    r'<label className="text-sm font-medium text-gray-700">Storage Number</label>':
        r'<label className="text-sm font-medium text-gray-700">{t(\'propertyForm.storageNumber\')}</label>',

    r'placeholder="Storage unit #"':
        r'placeholder={t(\'propertyForm.storageNumberPlaceholder\')}',

    r'<label className="text-sm font-medium text-gray-700">Storage Code</label>':
        r'<label className="text-sm font-medium text-gray-700">{t(\'propertyForm.storageCode\')}</label>',

    r'placeholder="Access code"':
        r'placeholder={t(\'propertyForm.storageCodePlaceholder\')}',

    r'<label className="text-sm font-medium text-gray-700">Garage Number</label>':
        r'<label className="text-sm font-medium text-gray-700">{t(\'propertyForm.garageNumber\')}</label>',

    r'placeholder="Parking spot #"':
        r'placeholder={t(\'propertyForm.garageNumberPlaceholder\')}',

    r'<label className="text-sm font-medium text-gray-700">Front Desk</label>':
        r'<label className="text-sm font-medium text-gray-700">{t(\'propertyForm.frontDesk\')}</label>',

    r'placeholder="Front desk info"':
        r'placeholder={t(\'propertyForm.frontDeskPlaceholder\')}',

    r'<label className="text-sm font-medium text-gray-700">Mailing Box</label>':
        r'<label className="text-sm font-medium text-gray-700">{t(\'propertyForm.mailingBox\')}</label>',

    r'placeholder="Mailbox number"':
        r'placeholder={t(\'propertyForm.mailingBoxPlaceholder\')}',

    r'<label className="text-sm font-medium text-gray-700">Pool Access Code</label>':
        r'<label className="text-sm font-medium text-gray-700">{t(\'propertyForm.poolAccessCode\')}</label>',

    r'placeholder="Pool code"':
        r'placeholder={t(\'propertyForm.poolAccessCodePlaceholder\')}',

    r'<h4 className="text-lg font-semibold mb-2">Amenities</h4>':
        r'<h4 className="text-lg font-semibold mb-2">{t(\'propertyForm.amenities\')}</h4>',

    r'<p className="text-sm text-muted-foreground mb-4">Select all amenities available at this property</p>':
        r'<p className="text-sm text-muted-foreground mb-4">{t(\'propertyForm.amenitiesDesc\')}</p>',

    r'<h4 className="text-lg font-semibold mb-2">Rules</h4>':
        r'<h4 className="text-lg font-semibold mb-2">{t(\'propertyForm.rules\')}</h4>',

    r'<p className="text-sm text-muted-foreground mb-4">Select all rules that apply to this property</p>':
        r'<p className="text-sm text-muted-foreground mb-4">{t(\'propertyForm.rulesDesc\')}</p>',

    r'<h3 className="text-lg font-semibold mb-2">Property Profile Image</h3>':
        r'<h3 className="text-lg font-semibold mb-2">{t(\'propertyForm.propertyProfileImage\')}</h3>',

    r'<p className="text-sm text-muted-foreground mb-4">Upload one profile image to represent this property</p>':
        r'<p className="text-sm text-muted-foreground mb-4">{t(\'propertyForm.propertyProfileImageDesc\')}</p>',

    r'<label className="text-sm font-medium">Upload Profile Image</label>':
        r'<label className="text-sm font-medium">{t(\'propertyForm.uploadProfileImage\')}</label>',

    r'Remove\s*</Button>':
        r'{t(\'propertyForm.remove\')}\n                          </Button>',

    r'<label className="text-sm font-medium mb-1 block">Image Title \(Optional\)</label>':
        r'<label className="text-sm font-medium mb-1 block">{t(\'propertyForm.imageTitleOptional\')}</label>',

    r'placeholder="Enter image title or description"':
        r'placeholder={t(\'propertyForm.imageTitlePlaceholder\')}',
}

# Apply all replacements
for pattern, replacement in replacements.items():
    content = re.sub(pattern, replacement, content)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ Successfully updated {len(replacements)} translations in PropertyForm.tsx")
