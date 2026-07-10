/// Social & contact links — mirrors frontend `config/contact.js`.
class SocialLink {
  const SocialLink({
    required this.id,
    required this.label,
    required this.description,
    required this.href,
    required this.platform,
  });

  final String id;
  final String label;
  final String description;
  final String href;
  final String platform;
}

abstract final class ContactConfig {
  static const contactEmail = 'bulkmobilemart@gmail.com';

  static const contactPhoneRaw = '8766687111';
  static const contactPhoneDisplay = '+91 87666 87111';
  static const contactPhoneTel = 'tel:+918766687111';

  static const contactLocation = 'Mumbai';

  static const contactAddress =
      'SHOP NO. 2155, 2ND FLOOR, Nathani Heights, Opp. Mumbai Central Railway Station, Mumbai, 400008';

  static const whatsAppGroupUrl =
      'https://chat.whatsapp.com/KEjIzY8mRbn8vR3LYBxnP8';

  static const socialLinks = <SocialLink>[
    SocialLink(
      id: 'whatsapp-community',
      label: 'WhatsApp Community',
      description: 'Join our community group',
      href: 'https://chat.whatsapp.com/KEjIzY8mRbn8vR3LYBxnP8',
      platform: 'whatsapp',
    ),
    SocialLink(
      id: 'whatsapp-channel',
      label: 'WhatsApp Channel',
      description: 'Follow for latest updates',
      href: 'https://whatsapp.com/channel/0029VbD3QHm8KMqo7ZP42U2a',
      platform: 'whatsapp',
    ),
    SocialLink(
      id: 'whatsapp-catalog',
      label: 'WhatsApp Catalog',
      description: 'Browse our product catalog',
      href: 'https://wa.me/c/917400222233',
      platform: 'whatsapp',
    ),
    SocialLink(
      id: 'instagram',
      label: 'Instagram',
      description: '@bulkmobilemart.in',
      href:
          'https://www.instagram.com/bulkmobilemart.in?igsh=YjlwcjZzamdpYXdp&utm_source=qr',
      platform: 'instagram',
    ),
    SocialLink(
      id: 'facebook',
      label: 'Facebook',
      description: 'Like & follow our page',
      href: 'https://www.facebook.com/share/17vXtbcF4D/?mibextid=wwXIfr',
      platform: 'facebook',
    ),
  ];
}
