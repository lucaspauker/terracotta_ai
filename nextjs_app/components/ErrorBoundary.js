import * as React from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    // Define a state variable to track whether is an error or not
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }
  componentDidCatch(error, errorInfo) {
    // You can use your own error logging service here
    console.log({ error, errorInfo })
  }
  render() {
    // Check if the error is thrown
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className='main'>
          <div className='horizontal-box full-width'>
            <Typography variant='h4' className='page-main-header'>
              Oops, there is an error!
            </Typography>
          </div>
          <div className='medium-space' />
          <div className='horizontal-box'>
            <Button
              variant='contained'
              size='large'
              onClick={() => this.setState({ hasError: false })}
            >
              Try again?
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
