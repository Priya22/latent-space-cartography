#!/usr/bin/env python
# configurations unique to emoji dataset

dset = 'emoji'
img_rows, img_cols, img_chns = 64, 64, 4
img_mode = 'RGBA'
train_split = 13500

fn_raw = 'emoji.h5'
key_raw = 'emoji' # the dataset key in hdf5 file

dims = [32] # all latent dims
