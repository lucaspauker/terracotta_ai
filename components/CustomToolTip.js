import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';

export const CustomTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: '#9C2315',
    color: 'white',
    boxShadow: theme.shadows[1],
    fontSize: 16,
    maxWidth: 200,
    padding: 16,
  },
}));

