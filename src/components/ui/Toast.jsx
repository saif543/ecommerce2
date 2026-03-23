'use client'

import Swal from 'sweetalert2'

const toast = {
    success: (message, title = 'Success!') => {
        Swal.fire({
            icon: 'success',
            title,
            text: message,
            timer: 2000,
            showConfirmButton: false,
            confirmButtonColor: '#3F72AF',
        })
    },
    error: (message, title = 'Error') => {
        Swal.fire({
            icon: 'error',
            title,
            text: message,
            confirmButtonColor: '#3F72AF',
        })
    },
    warning: (message, title = 'Warning') => {
        Swal.fire({
            icon: 'warning',
            title,
            text: message,
            confirmButtonColor: '#3F72AF',
        })
    },
    info: (message, title = 'Info') => {
        Swal.fire({
            icon: 'info',
            title,
            text: message,
            confirmButtonColor: '#3F72AF',
        })
    },
}

export default toast
