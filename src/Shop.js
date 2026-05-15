import React from 'react';
import './App.css';

// 🎭 Avatar catalog. 'bee' is free and owned by default.
export const AVATAR_CATALOG = [
  { id: 'bee',       name: 'Buzzy Bee',       image: '/avatars/bee.png',       price: 0   },
  { id: 'cat',       name: 'Tabby Cat',       image: '/avatars/cat.png',       price: 50  },
  { id: 'dog',       name: 'Puppy Pal',       image: '/avatars/dog.png',       price: 75  },
  { id: 'unicorn',   name: 'Rainbow Unicorn', image: '/avatars/unicorn.png',   price: 150 },
  { id: 'dragon',    name: 'Baby Dragon',     image: '/avatars/dragon.png',    price: 200 },
  { id: 'astronaut', name: 'Space Cadet',     image: '/avatars/astronaut.png', price: 300 },
];

export const getAvatarById = (id) =>
  AVATAR_CATALOG.find(a => a.id === id) || AVATAR_CATALOG[0];

const Shop = ({
  goldCount = 0,
  ownedAvatars = ['bee'],
  equippedAvatar = 'bee',
  onBuy = () => {},
  onEquip = () => {},
  onClose = () => {},
}) => {
  return (
    <div className="shop-overlay" onClick={onClose}>
      <div className="shop-content" onClick={e => e.stopPropagation()}>
        <div className="shop-modal-header">
          <h2>🛒 Avatar Shop</h2>
          <div className="shop-gold-badge">💰 {goldCount}</div>
          <button className="shop-modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="shop-sub">Spend gold to unlock new avatars. Equip any avatar you own.</p>

        <div className="shop-grid">
          {AVATAR_CATALOG.map(av => {
            const owned = ownedAvatars.includes(av.id);
            const equipped = av.id === equippedAvatar;
            const canAfford = goldCount >= av.price;

            return (
              <div key={av.id} className={`shop-card ${equipped ? 'equipped' : ''}`}>
                <div className="shop-card-img-wrap">
                  <img src={av.image} alt={av.name} className="shop-card-img" />
                </div>
                <div className="shop-card-name">{av.name}</div>
                <div className="shop-card-price">
                  {av.price === 0 ? 'FREE' : `💰 ${av.price}`}
                </div>

                {equipped ? (
                  <button className="shop-card-btn equipped-btn" disabled>✓ Equipped</button>
                ) : owned ? (
                  <button
                    className="shop-card-btn equip-btn"
                    onClick={() => onEquip(av.id)}
                  >Equip</button>
                ) : (
                  <button
                    className={`shop-card-btn buy-btn ${!canAfford ? 'disabled' : ''}`}
                    disabled={!canAfford}
                    onClick={() => onBuy(av.id)}
                  >{canAfford ? 'Buy' : 'Not enough gold'}</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Shop;
