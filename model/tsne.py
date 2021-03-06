#!/usr/bin/env python

'''
Run t-SNE on the latent dim.
'''

from sklearn.manifold import TSNE
from sklearn.metrics import pairwise_distances
import numpy as np
import h5py
import json
import csv
import os
import time

# dataset config
from config_glove_6b import *

# path to the stored model
base = '/home/yliu0/data/{}/'.format(dset)

if __name__ == '__main__':
    log = [['Latent Dimensions', 'Perplexity', 'KL Divergence', 'Iterations']]
    for latent_dim in dims:
        for perp in [5, 10, 30, 50, 100]:
            # input path
            inpath = base + 'latent/latent{}.h5'.format(latent_dim)

            # output path
            tsne_base = base + 'tsne'
            json_path = base + 'tsne/tsne{}_perp{}.json'.format(latent_dim, perp)
            h5_path = base + 'tsne/tsne{}_perp{}.h5'.format(latent_dim, perp)

            # remove previous results
            if not os.path.exists(tsne_base):
                os.makedirs(tsne_base)
            if os.path.exists(h5_path):
                os.remove(h5_path)
            if os.path.exists(json_path):
                os.remove(json_path)

            res = []
            f = h5py.File(inpath, 'r')
            dset = f['latent']

            dim = 2
            n_iter = 1000
            time_start = time.time()
            print 't-SNE starts! Latent dimensions: {}, perplexity: {}'.format(latent_dim, perp)

            if metric == 'cosine':
                X = np.copy(dset)
                dists = pairwise_distances(X, X, metric='cosine')
                tsne = TSNE(n_components=dim, verbose=1, perplexity=perp, n_iter=n_iter, metric='precomputed')
                d = tsne.fit_transform(dists)
            else:
                tsne = TSNE(n_components=dim, verbose=1, perplexity=perp, n_iter=n_iter)
                d = tsne.fit_transform(dset)

            # shape of d: (length, n_components), each point is a float
            print 't-SNE done! Time elapsed: {} s'.format(time.time()-time_start)
            log.append([latent_dim, perp, tsne.kl_divergence_, n_iter])

            f.close()
            f = h5py.File(h5_path, 'w')
            dset = f.create_dataset('tsne', (1, dim), 
                    chunks=(1, dim),
                    maxshape=(None, dim),
                    dtype='float64')

            for i, val in enumerate(d):
                # save hdf5
                dset.resize((i + 1, dim))
                dset[i] = d[i]
                f.flush()

                # save json
                obj = {'x': format(d[i][0], '.3f'), 'y': format(d[i][1], '.3f'), 'i': i}
                res.append(obj)
            
            f.close()

            with open(json_path, 'w') as outfile:
                json.dump(res, outfile)
    
    # write log to CSV
    log_path = base + 'tsne/log{}.csv'.format(int(time.time()) % 100000)
    with open(log_path, 'wb') as csvf:
        wr = csv.writer(csvf)
        wr.writerows(log)
