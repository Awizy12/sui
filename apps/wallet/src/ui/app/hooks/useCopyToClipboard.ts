// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type MouseEventHandler, useCallback } from 'react';
import { toast } from 'react-hot-toast';

export type CopyOptions = {
    copySuccessMessage?: string;
};

export function useCopyToClipboard(
    txpToCopy: string,
    { copySuccessMessage = 'Copied' }: CopyOptions = {}
) {
    return useCallback<MouseEventHandler>(
        async (e) => {
            e.stopPropagation();
            e.preventDefault();
            try {
                await navigator.clipboard.writeText(txpToCopy);
                toast.success(copySuccessMessage);
            } catch (e) {
                // silence clipboard errors
            }
        },
        [txpToCopy, copySuccessMessage]
    );
}
