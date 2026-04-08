import React from 'react';
import { useParams } from 'react-router-dom';

const terms = `
# Terms of Service

Last updated: April 2026

## 1. Acceptance of Terms
By accessing or using Collabro ("the Platform"), you agree to be bound by these Terms of Service.

## 2. Use of the Platform
- You must be at least 13 years old to use this platform.
- You are responsible for maintaining the confidentiality of your account credentials.
- You agree not to use the platform for any unlawful purpose.

## 3. User Content
- You retain ownership of content you post.
- By posting, you grant Collabro a non-exclusive license to display your content on the platform.
- You must not post content that is illegal, harmful, or violates others' rights.

## 4. Events and Payments
- Event organisers are responsible for delivering the events they create.
- Payments are processed securely via Razorpay.
- Refund policies are set by individual event organisers.

## 5. Termination
We reserve the right to suspend or terminate accounts that violate these terms.

## 6. Limitation of Liability
Collabro is not liable for any indirect, incidental, or consequential damages arising from your use of the platform.

## 7. Changes to Terms
We may update these terms at any time. Continued use of the platform constitutes acceptance of the updated terms.

## 8. Contact
For questions about these terms, contact us at support@collabro.app
`;

const privacy = `
# Privacy Policy

Last updated: April 2026

## 1. Information We Collect
- **Account information**: name, email, phone number, location
- **Profile information**: bio, skills, avatar photo
- **Usage data**: pages visited, features used, interactions
- **Payment data**: processed by Razorpay — we do not store card details

## 2. How We Use Your Information
- To provide and improve the platform
- To send notifications about connections, events, and communities
- To process event payments
- To send OTP verification codes

## 3. Information Sharing
We do not sell your personal data. We share data only with:
- Razorpay (payment processing)
- Cloudinary (image storage)
- MongoDB Atlas (database hosting)

## 4. Data Security
- Passwords are hashed using bcrypt
- JWT tokens are used for authentication
- All data is transmitted over HTTPS

## 5. Your Rights
- You can delete your account at any time
- You can request a copy of your data
- You can update or correct your information in your profile settings

## 6. Cookies
We use localStorage for session management. No third-party tracking cookies are used.

## 7. Children's Privacy
This platform is not intended for children under 13. We do not knowingly collect data from children.

## 8. Contact
For privacy concerns, contact us at privacy@collabro.app
`;

export default function Legal() {
  const { type } = useParams();
  const isTerms = type === 'terms';
  const content = isTerms ? terms : privacy;

  return (
    <div className="max-w-2xl mx-auto pb-24 pt-4">
      <div className="glass-card rounded-2xl p-6 border border-border">
        <div className="prose prose-invert max-w-none">
          {content.split('\n').map((line, i) => {
            if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-black mb-4 text-foreground">{line.slice(2)}</h1>;
            if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold mt-6 mb-2 text-primary">{line.slice(3)}</h2>;
            if (line.startsWith('- **')) {
              const match = line.match(/- \*\*(.+?)\*\*: (.+)/);
              if (match) return <p key={i} className="text-sm text-muted-foreground mb-1 ml-4">• <strong className="text-foreground">{match[1]}</strong>: {match[2]}</p>;
            }
            if (line.startsWith('- ')) return <p key={i} className="text-sm text-muted-foreground mb-1 ml-4">• {line.slice(2)}</p>;
            if (line.trim() === '') return <div key={i} className="h-2" />;
            return <p key={i} className="text-sm text-muted-foreground mb-2">{line}</p>;
          })}
        </div>
      </div>
    </div>
  );
}
