import { Tooltip } from 'antd'
import { BadgeInfoIcon, InfoIcon } from 'lucide-react'
import React from 'react'

const InfoTootlip = ({ text, icon, size, color }: { icon?: React.ReactNode, text: string, size?: number, color?: string }) => {
    return (
        <Tooltip title={text} color='black' destroyTooltipOnHide={true}>
            {icon ||
                <BadgeInfoIcon color={color || 'dodgerBlue'} size={size || 16} />
            }
        </Tooltip>
    )
}

export default InfoTootlip