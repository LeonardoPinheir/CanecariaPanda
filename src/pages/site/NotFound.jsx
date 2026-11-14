import { Link } from 'react-router-dom';
import { Mug } from '../../components/Art.jsx';

export default function NotFound() {
  return (
    <div className="container-site flex flex-col items-center py-16 text-center">
      <Mug text="404" color="#ffffff" accent="#F26B1D" className="w-64" />
      <h1 className="mt-4 text-5xl font-extrabold">Esta página não existe</h1>
      <p className="mt-3 text-lg text-muted">O endereço pode ter mudado. Que tal ver os produtos?</p>
      <Link to="/produtos" className="btn-primary mt-8 px-8 py-3">Ver produtos</Link>
    </div>
  );
}
