import { Check, Crown, User } from 'lucide-react';

const LabelBadge = ({ type }) => {
    const getLabelInfo = () => {
        switch (type) {
            case 'owner':
                return {
                    text: 'Właściciel',
                    icon: <Crown size={12} />,
                    className: 'badge-owner'
                };
            case 'client':
                return {
                    text: 'Klient',
                    icon: <Check size={12} />,
                    className: 'badge-client'
                };
            default:
                return {
                    text: 'Użytkownik',
                    icon: <User size={12} />,
                    className: 'badge-user'
                };
        }
    };

    const label = getLabelInfo();

    return (
        <span className={`badge ${label.className}`}>
            {label.icon}
            {label.text}
        </span>
    );
};

export default LabelBadge;