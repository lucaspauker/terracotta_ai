import React, { useState, useRef, useEffect } from 'react';
import { Menu, MenuItem, IconButton } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const MenuComponent = ({ editFunction, deleteFunction }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const menuRef = useRef(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    if (editFunction) {
      editFunction();
    }
    handleClose();
  };

  const handleDelete = () => {
    if (deleteFunction) {
      deleteFunction();
    }
    handleClose();
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  return (
    <div ref={menuRef}>
      <IconButton
        aria-controls="menu"
        aria-haspopup="true"
        onClick={handleClick}
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        id="menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {editFunction && (
          <MenuItem
            onClick={handleEdit}
            sx={{ color: 'black' }}
          >
            <EditIcon sx={{ color: 'grey', marginRight: '8px' }} />
            Edit
          </MenuItem>
        )}
        {deleteFunction && (
          <MenuItem
            onClick={handleDelete}
            sx={{ color: 'black' }}
          >
            <DeleteIcon sx={{ color: 'grey', marginRight: '8px' }} />
            Delete
          </MenuItem>
        )}
      </Menu>
    </div>
  );
};

export default MenuComponent;

