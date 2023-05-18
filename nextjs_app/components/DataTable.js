import React, { useState, useCallback, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TablePagination from '@mui/material/TablePagination';
import Divider from '@mui/material/Divider';

function DataTable({ headers, rawData }) {
  const [page, setPage] = useState(0);
  const [visibleRows, setVisibleRows] = useState(rawData.slice(0, 5));
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
    const updatedRows = rawData.slice(newPage * rowsPerPage, newPage * rowsPerPage + rowsPerPage);
    setVisibleRows(updatedRows);
  }, [rawData, rowsPerPage]);

  const handleChangeRowsPerPage = useCallback((event) => {
    const updatedRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(updatedRowsPerPage);
    setPage(0);
    const updatedRows = rawData.slice(0 * updatedRowsPerPage, 0 * updatedRowsPerPage + updatedRowsPerPage);
    setVisibleRows(updatedRows);
  }, [rawData]);

  useEffect(() => {
    setVisibleRows(rawData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage));
  }, [rawData, page, rowsPerPage]);

  return (
    <Paper variant="outlined" className="shadow">
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              {headers.map((header, i) => (
                <TableCell
                  key={i}
                  align="center"
                  style={{
                    borderRight: i === headers.length - 1 ? 'none' : '1px dashed lightgrey',
                    borderBottom: '3px solid #9C2315',
                    borderTop: 'none',
                    fontSize: '16px', // Increase font size for the header row
                    fontWeight: 'bold',
                  }}
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row, i) => (
              <TableRow
                key={i}
                sx={{
                  '&:last-child td, &:last-child th': { border: 0 },
                  maxHeight: '200px',
                  overflow: 'auto',
                }}
              >
                {headers.map((header, j) => (
                  <TableCell
                    key={j}
                    style={{
                      borderRight: j === headers.length - 1 ? 'none' : '1px dashed lightgrey',
                      borderBottom: i === visibleRows.length - 1 ? '0px' : '1px dashed lightgrey',
                    }}
                  >
                    <div className="cell-content small-scrollbar" style={{ maxHeight: '200px', overflow: 'auto' }}>
                      {row[header]}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Divider />
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={rawData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}

export default DataTable;

