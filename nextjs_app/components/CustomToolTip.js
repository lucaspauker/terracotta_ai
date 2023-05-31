import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';
import { BiInfoCircle } from 'react-icons/bi';
import IconButton from '@mui/material/IconButton';

export const CustomTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    border: '1px solid #9C2315',
    backgroundColor: 'white',
    color: 'black',
    boxShadow: theme.shadows[4],
    textAlign: 'center',
    fontSize: 14,
    maxWidth: 200,
    padding: 8,
    letterSpacing: 0.4,
    overflowWrap: 'break-word',
  },
}));

export const createCustomTooltip = (text) => {
  return <CustomTooltip title={"💡 " + text} className='tooltip'>
    <IconButton disableRipple={true}>
      <BiInfoCircle size={16} color='#9C2315'/>
    </IconButton>
  </CustomTooltip>
}
