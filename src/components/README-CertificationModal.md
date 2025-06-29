# CertificationModal Component

A reusable React modal component for displaying detailed certification information with audit trail functionality.

## Features

- **Responsive Design**: Adapts to desktop and mobile screens
- **Accessibility**: Full keyboard navigation, focus management, and screen reader support
- **Smooth Animations**: Fade-in/fade-out effects with backdrop blur
- **Document Actions**: View/download buttons for certification documents
- **Audit Trail**: Historical activity tracking for each certification
- **Professional Styling**: Consistent with StaffCertify app design using Tailwind CSS

## Usage

```jsx
import CertificationModal from './components/CertificationModal';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);

  const handleOpenModal = (certification) => {
    setSelectedCert(certification);
    // Fetch audit trail data here
    setAuditTrail(auditTrailData);
    setShowModal(true);
  };

  return (
    <>
      {/* Your UI here */}
      <CertificationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        certification={selectedCert}
        auditTrail={auditTrail}
      />
    </>
  );
}
```

## Props

### Required Props

- `isOpen` (boolean): Controls modal visibility
- `onClose` (function): Callback when modal should close

### Optional Props

- `certification` (object): Certification data to display
  - `id`: Unique identifier
  - `certification_name`: Name of the certification
  - `issue_date`: Date when certification was issued (ISO string)
  - `expiry_date`: Date when certification expires (ISO string)
  - `status`: Current status ('Valid', 'Expiring Soon', 'Expired')
  - `document_filename`: Name of associated document file

- `auditTrail` (array): Array of audit trail entries
  - `id`: Unique identifier for the entry
  - `action`: Description of the action performed
  - `created_at` or `date`: When the action occurred (ISO string)
  - `performed_by`: User who performed the action

## Keyboard Accessibility

- **ESC**: Closes the modal
- **Tab**: Navigates between focusable elements within modal
- **Shift+Tab**: Navigates backwards through focusable elements
- Focus is trapped within the modal when open
- Focus returns to trigger element when closed

## Styling

The component uses Tailwind CSS classes consistent with the StaffCertify app:
- Dark theme with slate colors
- Sky blue accents for interactive elements
- Status-specific colors (green for valid, amber for expiring, red for expired)
- Responsive grid layout for certification details

## Demo

A complete demonstration is available at the "Modal Demo" page in the StaffCertify app navigation, which shows:
- Sample certifications with different statuses
- Interactive table rows that open the modal
- Complete audit trail examples
- All accessibility features in action

## Implementation Notes

- The modal uses React portals and is rendered at the root level
- Document actions are placeholder functions that need to be implemented based on your file storage solution
- Audit trail data should be fetched from your database when opening the modal
- The component prevents body scrolling when open
- Click outside or ESC key closes the modal

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- Tested with Chrome, Firefox, Safari, and Edge
- Mobile responsive design works on iOS and Android browsers 