import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
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

export const createCustomTooltip = (text, error) => {
  return <CustomTooltip title={"💡 " + text} className='tooltip'>
    <IconButton disableRipple={true}>
      {error ?
        <ErrorOutlineIcon sx={{fontSize:16, marginBottom:'2px'}} color='primary'/>
        :
        <InfoOutlinedIcon sx={{fontSize:16, marginBottom:'2px'}} color='primary'/>
      }
    </IconButton>
  </CustomTooltip>
}
