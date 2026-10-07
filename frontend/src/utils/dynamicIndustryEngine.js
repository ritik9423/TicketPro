// DYNAMIC MULTI-TENANT INDUSTRY & COMPANY CATEGORY ENGINE FOR TICKETPRO
// Automatically generates industry-tailored Categories, Dynamic Forms, and Auto-Assignment Agent Roles for ANY Company Tenant!

export const generateCategoriesForIndustry = (companyCode = 'DEFAULT', companyName = '', industryType = '') => {
  const code = (companyCode || 'DEFAULT').toUpperCase();
  const nameStr = (companyName || '').toLowerCase();
  const indStr = (industryType || '').toLowerCase();

  // 1. Oil & Gas / Energy / Petroleum
  if (indStr.includes('oil') || indStr.includes('energy') || indStr.includes('petroleum') || nameStr.includes('oil') || nameStr.includes('energy')) {
    return [
      {
        id: `cat_${code}_1`,
        name: 'Refinery Telemetry & Automation',
        description: 'Plant sensor alerts, pipeline pressure SCADA telemetry & valve automation faults.',
        status: 'ACTIVE',
        companyCode: code,
        assignedRole: 'Refinery Maintenance Engineer',
        assignedAgent: `${companyName || code} Refinery Lead`,
        customFields: [
          { label: 'Plant Unit Location', type: 'select', required: true, options: ['Mathura Refinery', 'Panipat Refinery', 'Haldia Refinery', 'Koyali Refinery', 'Main Plant Unit'] },
          { label: 'Pipeline Pressure (PSI)', type: 'number', required: true, placeholder: 'Enter current PSI reading' },
          { label: 'Hazard Level', type: 'select', required: true, options: ['CRITICAL', 'HIGH', 'NORMAL'] }
        ]
      },
      {
        id: `cat_${code}_2`,
        name: 'Fuel Retail & Dispenser Pumps',
        description: 'Dispenser nozzle leaks, RFID card scanner faults & POS terminal errors.',
        status: 'ACTIVE',
        companyCode: code,
        assignedRole: 'Retail Station Support Agent',
        assignedAgent: `${companyName || code} Retail Tech`,
        customFields: [
          { label: 'Station Outlet ID', type: 'text', required: true, placeholder: 'e.g. STATION-9042' },
          { label: 'Dispenser Unit Number', type: 'number', required: true, placeholder: 'Pump #1, #2' },
          { label: 'Fault Type', type: 'select', required: true, options: ['RFID Reader Timeout', 'Nozzle Pressure Leak', 'POS Screen Freeze'] }
        ]
      },
      {
        id: `cat_${code}_3`,
        name: 'Logistics & Tanker Fleet Tracking',
        description: 'GPS telemetry tracking failure, tanker breakdown on route, or fuel dispatch delay.',
        status: 'ACTIVE',
        companyCode: code,
        assignedRole: 'Fleet Logistics Manager',
        assignedAgent: `${companyName || code} Logistics Manager`,
        customFields: [
          { label: 'Tanker / Vehicle Plate No', type: 'text', required: true, placeholder: 'e.g. MH-12-AB-1234' },
          { label: 'Current Breakdown Location', type: 'text', required: true, placeholder: 'Highway / Depot Pin' },
          { label: 'Emergency Towing Required?', type: 'select', required: true, options: ['YES', 'NO'] }
        ]
      }
    ];
  }

  // 2. Healthcare / Hospitals / Pharma
  if (indStr.includes('health') || indStr.includes('hospital') || indStr.includes('pharma') || nameStr.includes('health') || nameStr.includes('pharma') || nameStr.includes('hospital')) {
    return [
      {
        id: `cat_${code}_1`,
        name: 'Medical Equipment & ICU Hardware',
        description: 'Ventilator malfunction, patient monitor sensor error, MRI/CT scanner calibration alert.',
        status: 'ACTIVE',
        companyCode: code,
        assignedRole: 'Biomedical Engineer',
        assignedAgent: `${companyName || code} BioMed Tech`,
        customFields: [
          { label: 'Hospital Ward / Department', type: 'select', required: true, options: ['ICU', 'Radiology', 'Pathology Lab', 'Operating Theater', 'Emergency'] },
          { label: 'Medical Asset Serial Tag', type: 'text', required: true, placeholder: 'e.g. VENT-9042' },
          { label: 'Patient Safety Priority', type: 'select', required: true, options: ['EMERGENCY CRITICAL', 'HIGH', 'NORMAL'] }
        ]
      },
      {
        id: `cat_${code}_2`,
        name: 'Pharmacy & Drug Inventory System',
        description: 'Medicine stock sync error, prescription barcode scanner issue, or billing software crash.',
        status: 'ACTIVE',
        companyCode: code,
        assignedRole: 'Pharmacy IT Specialist',
        assignedAgent: `${companyName || code} Pharmacy Lead`,
        customFields: [
          { label: 'Rx Batch Number', type: 'text', required: true, placeholder: 'e.g. BATCH-9920' },
          { label: 'Dispense Counter No', type: 'number', required: true, placeholder: 'Counter #1' }
        ]
      },
      {
        id: `cat_${code}_3`,
        name: 'Patient Health Portal & EHR Access',
        description: 'Electronic Health Record access permission, lab report portal bug, or doctor login loop.',
        status: 'ACTIVE',
        companyCode: code,
        assignedRole: 'EHR Systems Admin',
        assignedAgent: `${companyName || code} EHR Admin`,
        customFields: [
          { label: 'Doctor / Staff License ID', type: 'text', required: true, placeholder: 'License ID' },
          { label: 'Portal Module', type: 'select', required: true, options: ['EHR Records', 'Lab Results', 'Patient Scheduling', 'TeleMed Video'] }
        ]
      }
    ];
  }

  // 3. Banking / Finance / Fintech
  if (indStr.includes('bank') || indStr.includes('finance') || indStr.includes('fintech') || nameStr.includes('bank') || nameStr.includes('pay')) {
    return [
      {
        id: `cat_${code}_1`,
        name: 'ATM Cash Kiosks & Hardware',
        description: 'ATM Cash shutter jam, card reader timeout, vault sensor alert, or receipt printer failure.',
        status: 'ACTIVE',
        companyCode: code,
        assignedRole: 'ATM Hardware Specialist',
        assignedAgent: `${companyName || code} ATM Technician`,
        customFields: [
          { label: 'ATM Kiosk ID', type: 'text', required: true, placeholder: 'e.g. ATM-90421' },
          { label: 'Branch City / Sol ID', type: 'text', required: true, placeholder: 'Branch Name' },
          { label: 'Hardware Fault', type: 'select', required: true, options: ['Cash Shutter Jam', 'Card Reader Error', 'Receipt Printer Blank'] }
        ]
      },
      {
        id: `cat_${code}_2`,
        name: 'UPI & Payment Gateway Systems',
        description: 'Transaction drop rate alert, NPCI UPI timeout, or payment gateway API response latency.',
        status: 'ACTIVE',
        companyCode: code,
        assignedRole: 'Payment Gateway Engineer',
        assignedAgent: `${companyName || code} Payment Lead`,
        customFields: [
          { label: 'Transaction RRN Reference', type: 'text', required: true, placeholder: '12-digit RRN' },
          { label: 'Channel Source', type: 'select', required: true, options: ['Mobile App', 'UPI Service', 'NetBanking Portal', 'POS Card Machine'] }
        ]
      },
      {
        id: `cat_${code}_3`,
        name: 'Core Banking (CBS) & Security',
        description: 'Branch Finacle CBS latency, database backup alerts, or teller terminal freezes.',
        status: 'ACTIVE',
        companyCode: code,
        assignedRole: 'Core Banking Admin',
        assignedAgent: `${companyName || code} CBS Admin`,
        customFields: [
          { label: 'Branch SOL ID', type: 'text', required: true, placeholder: '4-digit SOL ID' },
          { label: 'Teller Terminal IP', type: 'text', required: false, placeholder: '10.x.x.x' }
        ]
      }
    ];
  }

  // 4. Automotive / Manufacturing / Engineering
  if (indStr.includes('auto') || indStr.includes('manufactur') || indStr.includes('engine') || nameStr.includes('motor') || nameStr.includes('auto')) {
    return [
      {
        id: `cat_${code}_1`,
        name: 'Assembly Line Robotics & Sensors',
        description: 'Robot welder calibration fault, conveyor belt sensor stop & pneumatic press alerts.',
        status: 'ACTIVE',
        companyCode: code,
        assignedRole: 'Automation Engineer',
        assignedAgent: `${companyName || code} Robotics Lead`,
        customFields: [
          { label: 'Plant Line Number', type: 'select', required: true, options: ['Line 1 (Body Shop)', 'Line 2 (Assembly)', 'Line 3 (Engine Shop)'] },
          { label: 'Robot Controller ID', type: 'text', required: true, placeholder: 'e.g. ROB-042' }
        ]
      },
      {
        id: `cat_${code}_2`,
        name: 'Quality Assurance & Diagnostic Tools',
        description: 'Vehicle ECU flashing software error, CAN bus diagnostic tool crash & dyno bench bugs.',
        status: 'ACTIVE',
        companyCode: code,
        assignedRole: 'Diagnostic Engineer',
        assignedAgent: `${companyName || code} QA Lead`,
        customFields: [
          { label: 'Chassis / VIN Number', type: 'text', required: true, placeholder: '17-digit VIN' },
          { label: 'Testing Tool', type: 'select', required: true, options: ['Diagnostic Studio', 'CANoe Tool', 'Dyno Bench System'] }
        ]
      }
    ];
  }

  // 5. Logistics / Transport / E-Commerce / Retail
  if (indStr.includes('logistic') || indStr.includes('transport') || indStr.includes('e-commerce') || indStr.includes('retail') || nameStr.includes('express') || nameStr.includes('retail')) {
    return [
      {
        id: `cat_${code}_1`,
        name: 'Warehouse Barcode Scanners & Sorting',
        description: 'High-speed sorter belt jam, handheld barcode scanner failure & warehouse WMS sync error.',
        status: 'ACTIVE',
        companyCode: code,
        assignedRole: 'Warehouse Systems Lead',
        assignedAgent: `${companyName || code} Warehouse Tech`,
        customFields: [
          { label: 'Hub / Warehouse ID', type: 'text', required: true, placeholder: 'Warehouse Hub ID' },
          { label: 'Sorter Belt / Dock No', type: 'number', required: true, placeholder: 'Dock #1' }
        ]
      },
      {
        id: `cat_${code}_2`,
        name: 'Fleet Delivery App & GPS Telemetry',
        description: 'Driver delivery mobile app sync error, live parcel GPS pin failure & proof-of-delivery upload bug.',
        status: 'ACTIVE',
        companyCode: code,
        assignedRole: 'Fleet IT Manager',
        assignedAgent: `${companyName || code} Logistics Manager`,
        customFields: [
          { label: 'Waybill / AWB Number', type: 'text', required: true, placeholder: 'AWB Tracking Number' },
          { label: 'Delivery Vehicle Plate No', type: 'text', required: true, placeholder: 'Vehicle Registration' }
        ]
      }
    ];
  }

  // 6. Real Estate & Construction
  if (indStr.includes('real estate') || indStr.includes('construct') || indStr.includes('property') || nameStr.includes('build') || nameStr.includes('estate')) {
    return [
      {
        id: `cat_${code}_1`,
        name: 'Site Equipment & Heavy Machinery',
        description: 'Tower crane motor alert, excavator hydraulic leak, or concrete mixer breakdown.',
        status: 'ACTIVE',
        companyCode: code,
        assignedRole: 'Heavy Equipment Engineer',
        assignedAgent: `${companyName || code} Site Equipment Lead`,
        customFields: [
          { label: 'Project Site Location', type: 'text', required: true, placeholder: 'Construction Site Name' },
          { label: 'Machinery Serial ID', type: 'text', required: true, placeholder: 'e.g. CRANE-9042' }
        ]
      },
      {
        id: `cat_${code}_2`,
        name: 'Tenant Facilities & Maintenance',
        description: 'HVAC chiller breakdown, elevator lift sensor fault, or electrical transformer alert.',
        status: 'ACTIVE',
        companyCode: code,
        assignedRole: 'Facility Manager',
        assignedAgent: `${companyName || code} Facility Manager`,
        customFields: [
          { label: 'Building Tower & Floor', type: 'text', required: true, placeholder: 'Tower B - 14th Floor' },
          { label: 'Facility Issue Type', type: 'select', required: true, options: ['HVAC Air Conditioning', 'Elevator Lift', 'Plumbing Leak', 'Fire Safety Alarm'] }
        ]
      }
    ];
  }

  // 7. General Enterprise IT & Operations (For ANY generic/unknown company)
  const defaultCompanyName = companyName || companyCode || 'Company';

  return [
    {
      id: `cat_${code}_1`,
      name: 'Software & Application Support',
      description: `Core business software bugs, application crashes & login issues for ${defaultCompanyName}.`,
      status: 'ACTIVE',
      companyCode: code,
      assignedRole: 'Software Support Engineer',
      assignedAgent: `${defaultCompanyName} Software Lead`,
      customFields: [
        { label: 'Application / Module Name', type: 'text', required: true, placeholder: 'Enter application name' },
        { label: 'Operating System / OS', type: 'select', required: true, options: ['Windows 11', 'macOS', 'Android App', 'Web Browser'] },
        { label: 'Error Details', type: 'textarea', required: true, placeholder: 'Describe the issue step by step' }
      ]
    },
    {
      id: `cat_${code}_2`,
      name: 'Hardware & Infrastructure Devices',
      description: `Office laptops, printers, monitors, servers & networking hardware for ${defaultCompanyName}.`,
      status: 'ACTIVE',
      companyCode: code,
      assignedRole: 'Hardware Technician',
      assignedAgent: `${defaultCompanyName} Hardware Tech`,
      customFields: [
        { label: 'Asset Reference / Serial Tag', type: 'text', required: true, placeholder: 'e.g. HW-90421' },
        { label: 'Device Category', type: 'select', required: true, options: ['Laptop', 'Desktop Monitor', 'Printer / Scanner', 'Network Router / Switch', 'Server Unit'] }
      ]
    },
    {
      id: `cat_${code}_3`,
      name: 'Access, VPN & Security Permissions',
      description: `Password resets, email account creation, VPN access & folder security permissions.`,
      status: 'ACTIVE',
      companyCode: code,
      assignedRole: 'System Administrator',
      assignedAgent: `${defaultCompanyName} SysAdmin`,
      customFields: [
        { label: 'Employee Email ID', type: 'text', required: true, placeholder: 'user@company.com' },
        { label: 'Permission Scope', type: 'select', required: true, options: ['VPN Network Access', 'Corporate Email Account', 'Folder Read/Write', 'Admin Privileges'] }
      ]
    },
    {
      id: `cat_${code}_4`,
      name: 'Operations & Service Desk',
      description: `General inquiries, facility requests, and administrative support for ${defaultCompanyName}.`,
      status: 'ACTIVE',
      companyCode: code,
      assignedRole: 'Service Desk Coordinator',
      assignedAgent: `${defaultCompanyName} Service Desk`,
      customFields: [
        { label: 'Department / Unit', type: 'select', required: true, options: ['Operations', 'Finance & Payroll', 'Human Resources', 'Sales & Marketing'] },
        { label: 'Request Summary', type: 'text', required: true, placeholder: 'Brief summary of request' }
      ]
    }
  ];
};

// Dynamically Resolves Auto-Assigned Agent for ANY Tenant Company based on Category & Specific ISSUE TYPE
export const resolveDynamicAutoAgent = (
  categoryName = '', 
  priority = 'MEDIUM', 
  issueType = '', 
  customFieldValues = {}, 
  companyCode = 'DEFAULT', 
  companyName = '', 
  industryType = ''
) => {
  const compLabel = companyName || companyCode || 'Company';

  // Extract combined issue text from issueType, form input fields, and category
  const valuesStr = typeof customFieldValues === 'object' ? Object.values(customFieldValues).join(' ') : String(customFieldValues || '');
  const combinedIssueText = `${issueType} ${valuesStr} ${categoryName}`.toLowerCase();

  // 1. Software / App / Gateway / Telemetry Software / Code Bugs
  if (combinedIssueText.includes('software') || combinedIssueText.includes('app') || combinedIssueText.includes('bug') || combinedIssueText.includes('code') || combinedIssueText.includes('display crash') || combinedIssueText.includes('gateway') || combinedIssueText.includes('login') || combinedIssueText.includes('portal')) {
    return {
      agentName: 'Rahul Sharma (Software Support Lead)',
      agentRole: 'Software Engineer & App Specialist',
      autoAssigned: true,
      reason: `Auto-assigned based on Issue Type: "Software / App Bug"`
    };
  }

  // 2. Mechanical / Engine / Breakdown / Fleet / Towing / Hardware Leaks
  if (combinedIssueText.includes('mechanical') || combinedIssueText.includes('engine') || combinedIssueText.includes('breakdown') || combinedIssueText.includes('towing') || combinedIssueText.includes('leak') || combinedIssueText.includes('pressure') || combinedIssueText.includes('tanker') || combinedIssueText.includes('pump') || combinedIssueText.includes('nozzle')) {
    return {
      agentName: 'Priya Patel (Mechanical & Fleet Specialist)',
      agentRole: 'Fleet Mechanic & Mechanical Lead',
      autoAssigned: true,
      reason: `Auto-assigned based on Issue Type: "Mechanical / Engine Breakdown"`
    };
  }

  // 3. Hardware / ATM / Scanner / Printer / Device / Kiosk / Sensor
  if (combinedIssueText.includes('hardware') || combinedIssueText.includes('printer') || combinedIssueText.includes('atm') || combinedIssueText.includes('rfid') || combinedIssueText.includes('scanner') || combinedIssueText.includes('kiosk') || combinedIssueText.includes('sensor') || combinedIssueText.includes('device') || combinedIssueText.includes('laptop') || combinedIssueText.includes('terminal')) {
    return {
      agentName: 'Amit Verma (Hardware & Device Specialist)',
      agentRole: 'Hardware Maintenance Technician',
      autoAssigned: true,
      reason: `Auto-assigned based on Issue Type: "Hardware & Physical Devices"`
    };
  }

  // 4. Network / VPN / Firewall / Infrastructure / Server
  if (combinedIssueText.includes('network') || combinedIssueText.includes('vpn') || combinedIssueText.includes('wifi') || combinedIssueText.includes('router') || combinedIssueText.includes('server') || combinedIssueText.includes('cbs') || combinedIssueText.includes('ip')) {
    return {
      agentName: 'Suresh Kumar (Network & Infra Admin)',
      agentRole: 'Network Infrastructure Engineer',
      autoAssigned: true,
      reason: `Auto-assigned based on Issue Type: "Network & VPN Infrastructure"`
    };
  }

  // 5. Refinery / Plant Operations / Telemetry
  if (combinedIssueText.includes('refinery') || combinedIssueText.includes('plant') || combinedIssueText.includes('telemetry') || combinedIssueText.includes('psi') || combinedIssueText.includes('robot')) {
    return {
      agentName: 'Ritik Kumar (Plant & Operations Lead)',
      agentRole: 'Plant Maintenance Lead',
      autoAssigned: true,
      reason: `Auto-assigned based on Issue Type: "Plant & Operations Telemetry"`
    };
  }

  // Fallback to Category match
  const categories = generateCategoriesForIndustry(companyCode, companyName, industryType);
  const matched = categories.find(c => c.name.toLowerCase() === (categoryName || '').toLowerCase());

  if (matched && matched.assignedAgent) {
    return {
      agentName: matched.assignedAgent,
      agentRole: matched.assignedRole || 'Support Specialist',
      autoAssigned: true,
      reason: `Auto-assigned via Category Rule for ${compLabel}: "${matched.name}"`
    };
  }

  // Priority-based fallback
  if (priority === 'URGENT' || priority === 'HIGH') {
    return {
      agentName: `${compLabel} Senior Lead Administrator`,
      agentRole: 'Lead Administrator',
      autoAssigned: true,
      reason: `Auto-routed to ${compLabel} Senior Lead due to ${priority} priority escalation.`
    };
  }

  return {
    agentName: `${compLabel} Helpdesk Agent`,
    agentRole: 'Support Agent',
    autoAssigned: true,
    reason: `Auto-assigned via ${compLabel} Round-Robin Engine.`
  };
};

// Aliases for backward compatibility
export const getCompanyDefaultCategories = generateCategoriesForIndustry;
export const resolveAutoAssignedAgent = resolveDynamicAutoAgent;
